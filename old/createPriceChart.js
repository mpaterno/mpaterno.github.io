function createPriceChart(svg, data, options) {
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLog()
        .domain([d3.min(data, d => d.price), d3.max(data, d => d.price)])
        .range([height, 0]);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .call(d3.axisLeft(y)
            .tickFormat(d => d3.format(".2e")(d)));

    // Add line
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.price));

    svg.append("path")
        .datum(data)
        .attr("class", `line ${options.className}`)
        .attr("d", line);

    // Add labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .text("Date");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text(`${options.name} Price (USD)`);

    svg.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .text(`${options.name} Price Over Time`);

    // Add hover effects
    const focus = svg.append("g")
        .style("display", "none");

    focus.append("circle")
        .attr("r", 5)
        .style("fill", options.color);

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", () => {
            focus.style("display", null);
            tooltip.style("opacity", 1);
        })
        .on("mouseout", () => {
            focus.style("display", "none");
            tooltip.style("opacity", 0);
        })
        .on("mousemove", event => {
            const bisect = d3.bisector(d => d.date).left;
            const x0 = x.invert(d3.pointer(event)[0]);
            const i = bisect(data, x0, 1);
            const d0 = data[i - 1];
            const d1 = data[i];
            const d = x0 - d0.date > d1.date - x0 ? d1 : d0;

            focus.attr("transform", `translate(${x(d.date)},${y(d.price)})`);
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(`Date: ${d.date.toLocaleDateString()}<br>${options.name} Price: $${d.price.toExponential(6)}`);
        });
}