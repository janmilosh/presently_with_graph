app.factory('MakeGraph', function () {
  var graph = {
    draw: function(response, locationText) {

      var svgHeight = 380;
      var svgWidth = 670;
      var margin = {top: 15, right: 20, bottom: 50, left: 50};
      var height = svgHeight - margin.top - margin.bottom;
      var width = svgWidth - margin.left - margin.right;

      var svgSelection = d3.select('svg')
        .attr('height', svgHeight)
        .attr('width', svgWidth)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

      //Process graph data inside a try/catch block in case there isn't any
      try {

        var parseDate = d3.time.format('%H %d %m %Y').parse;
        var dateFormat = d3.time.format('%I %p');

        //Historical data from almanac, parse temperatures as integers
        var high = response.almanac.temp_high;
        var low = response.almanac.temp_low;
        
        var normalHigh = parseInt(high.normal.F, 10);
        var recordHigh = parseInt(high.record.F, 10);
        var normalLow = parseInt(low.normal.F, 10);
        var recordLow = parseInt(low.record.F, 10);
        var recordHighYear = high.recordyear;
        var recordLowYear = low.recordyear;

        //Puts the dates in the proper format
        var hourlyDataArray = response.hourly_forecast;
        hourlyDataArray.forEach(function(item) {
          var timeBase = item.FCTTIME;

          var hour = timeBase.hour_padded;
          var day = timeBase.mday_padded;
          var month = timeBase.mon_padded;
          var year = timeBase.year;

          var date = [hour, day, month, year].join(' ');
          item.time = parseDate(date);

          item.temp = parseInt(item.temp.english, 10);
        });

        var startDateBase = hourlyDataArray[0].FCTTIME;
        var endDateBase = hourlyDataArray[35].FCTTIME;
        var startDate = startDateBase.mon_abbrev + ' ' + startDateBase.mday;
        var endDate = endDateBase.mon_abbrev + ' ' + endDateBase.mday;
        var endYear = endDateBase.year;
        
        var xRange = d3.extent(hourlyDataArray, function(d) { return d.time; });

        //We need to find max and min temps for the hourly and the historical data.
        //First find max and min for hourly, then put values in array and find overall range.
        var hourlyMax = d3.max(hourlyDataArray, function(d) { return d.temp });
        var hourlyMin = d3.min(hourlyDataArray, function(d) { return d.temp });
        var tempMaxMinArray = [hourlyMax, hourlyMin, recordHigh, normalHigh, recordLow, normalLow];
        var yRange = d3.extent(tempMaxMinArray, function(d) { return d });
        //extend the range a bit to accommodate text labels on the record high/low lines
        yRange[0] -= 8;
        yRange[1] += 8;

      } catch(e) {
        //If there's a problem with the data, log out the error and print a message
        console.log(e);

        svgSelection.append('text')
          .attr('class', 'title')
          .attr('x', (width/2 - 13))
          .attr('y', (height/2))
          .attr('text-anchor', 'middle')
          .text('There is no hourly data for this location. Please try another.');
      }

      if (yRange[0] > 0) {
        yRange[0] = 0;
      }
      if (yRange[1] < 90) {
        yRange[1] = 90;
      }
      var xScale = d3.time.scale()
        .domain(xRange).nice()
        .range([0, width]);
      var yScale = d3.scale.linear()
        .domain(yRange).nice() 
        .range([height, 0]);

      //Add line for the record high
      svgSelection.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y2', yScale(recordHigh))
        .attr('y1', yScale(recordHigh))
        .attr('class', 'record-line');

      //Add line for the record low
      svgSelection.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y2', yScale(recordLow))
        .attr('y1', yScale(recordLow))
        .attr('class', 'record-line');

      //Add text for record high
      svgSelection.append('text')
        .attr('class', 'record-text')
        .attr('x', width)
        .attr('y', yScale(recordHigh))
        .attr('text-anchor', 'end')
        .attr('dy', '-8')  
        .text('Record high in ' + recordHighYear);

      //Add text for record low
      svgSelection.append('text')
        .attr('class', 'record-text')
        .attr('x', width)
        .attr('y', yScale(recordLow))
        .attr('text-anchor', 'end')
        .attr('dy', '18')  
        .text('Record low in ' + recordLowYear);

      //Bound the normal temps by a rectangle
      svgSelection.append('rect')
        .attr('x', 0)
        .attr('y', yScale(normalHigh))
        .attr('height', yScale(normalLow)-yScale(normalHigh))
        .attr('width', width)
        .attr('class', 'normal-rect');

      //Add line for the normal high
      svgSelection.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y2', yScale(normalHigh))
        .attr('y1', yScale(normalHigh))
        .attr('class', 'normal-line');

      //Add line for the normal low
      svgSelection.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y2', yScale(normalLow))
        .attr('y1', yScale(normalLow))
        .attr('class', 'normal-line');

      //Add text for normal high
      svgSelection.append('text')
        .attr('class', 'normal-text')
        .attr('x', 0)
        .attr('y', yScale(normalHigh))
        .attr('text-anchor', 'left')
        .attr('dy', '-8')
        .attr('dx', '8')
        .text('Normal high');

      //Add text for normal low
      svgSelection.append('text')
        .attr('class', 'normal-text')
        .attr('x', 0)
        .attr('y', yScale(normalLow))
        .attr('text-anchor', 'left')
        .attr('dy', '18')
        .attr('dx', '8') 
        .text('Normal low');

      //Define and add hourly temperature as a line 
      var line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) { return xScale(d.time); })
        .y(function(d) { return yScale(d.temp); });

      svgSelection.append('path')
        .datum(hourlyDataArray)
        .attr('class', 'line')
        .attr('d', line);

      //Add x and y axis
      var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(d3.time.hours(xRange[0], xRange[1]).length)
        .tickFormat(dateFormat)
        .ticks(8);

      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(8);
      
      svgSelection.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0, ' + height + ')')
        .call(xAxis);

      svgSelection.append('g')
        .attr('class', 'axis')
        .call(yAxis);

      //Add title and label text
      svgSelection.append('text')
        .attr('class', 'title')
        .attr('x', (width/2))
        .attr('y', 0 - (margin.top/2))
        .attr('text-anchor', 'middle')
        .attr('dy', '10')
        .text('Hourly Forecast');

      svgSelection.append('text')
        .attr('class', 'label')
        .attr('x', 0)
        .attr('y', height + margin.bottom/2)
        .attr('dy', '16')
        .attr('text-anchor', 'left')  
        .text(startDate);

      svgSelection.append('text')
        .attr('class', 'label')
        .attr('x', width)
        .attr('y', height + margin.bottom/2)
        .attr('dy', '16')
        .attr('text-anchor', 'end')  
        .text(endDate);

      svgSelection.append('text')
        .attr('class', 'label')
        .attr('dx', '-40')
        .attr('y', height/2)
        .attr('text-anchor', 'middle')  
        .text('°F');
    }
  };
  return graph
});
  