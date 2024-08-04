import * as d3 from "d3";

// Function to create the time slider
export const createTimeSlider = (updateMap) => {
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = Math.min(1000, window.innerWidth - margin.left - margin.right);
  const height = 100 - margin.top - margin.bottom;

  const svg = d3
    .select("#timeline-slider")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleTime()
    .domain([new Date(2004, 0, 1), new Date()])
    .range([0, width]);

  const xAxis = d3
    .axisBottom(x)
    .ticks(d3.timeYear.every(1))
    .tickFormat(d3.timeFormat("%Y"));

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height / 2})`)
    .call(xAxis);

  const slider = svg
    .append("g")
    .attr("class", "slider")
    .attr("transform", `translate(0,${height / 2})`);

  slider
    .append("line")
    .attr("class", "track")
    .attr("x1", x.range()[0])
    .attr("x2", x.range()[1])
    .select(function () {
      return this.parentNode.appendChild(this.cloneNode(true));
    })
    .attr("class", "track-inset")
    .select(function () {
      return this.parentNode.appendChild(this.cloneNode(true));
    })
    .attr("class", "track-overlay")
    .call(
      d3
        .drag()
        .on("start.interrupt", function () {
          slider.interrupt();
        })
        .on("start drag", function (event) {
          const year = x.invert(event.x).getFullYear();
          handle.attr("cx", x(new Date(year, 0, 1)));
          d3.select("#year-label").text(year);
          updateMap(year);
        })
    );

  slider
    .insert("g", ".track-overlay")
    .attr("class", "ticks")
    .attr("transform", "translate(0,18)")
    .selectAll("text")
    .data(x.ticks(10))
    .enter();

  const handle = slider
    .insert("circle", ".track-overlay")
    .style("fill", "#005a8c")
    .style("stroke", "white")
    .style("stroke-width", 2)
    .attr("class", "handle")
    .attr("r", 9)
    .attr("cx", x(new Date()));

  svg
    .append("text")
    .attr("id", "year-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", 0)
    .text(new Date().getFullYear());
};
