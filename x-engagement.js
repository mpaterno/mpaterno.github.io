// X Engagement Graph
document.addEventListener('DOMContentLoaded', function() {
    // Load the data
    d3.csv('data/account_overview_analytics_phicoin.csv').then(data => {
        createXEngagementGraph(data);
    }).catch(error => {
        console.error('Error loading X engagement data:', error);
        document.getElementById('xEngagementGraph').innerHTML = '<p>Error loading data</p>';
    });

    function createXEngagementGraph(data) {
        // Parse the data
        data.forEach(d => {
            // Parse date (format: "Day, Month DD, YYYY")
            const dateParts = d.Date.replace(/"/g, '').match(/\w+, (\w+) (\d+), (\d+)/);
            if (dateParts) {
                const month = dateParts[1];
                const day = parseInt(dateParts[2]);
                const year = parseInt(dateParts[3]);
                d.parsedDate = new Date(`${month} ${day}, ${year}`);
            }
            
            // Convert numeric values
            d.Impressions = +d.Impressions;
            d.Likes = +d.Likes;
            d.Engagements = +d.Engagements;
            d.Replies = +d.Replies;
            d.Reposts = +d.Reposts;
            d.ProfileVisits = +d['Profile visits'];
            d.NewFollows = +d['New follows'];
        });

        // Sort data by date
        data.sort((a, b) => a.parsedDate - b.parsedDate);

        // Set up dimensions
        const container = document.getElementById('xEngagementGraph');
        const margin = {top: 40, right: 80, bottom: 90, left: 60};
        const width = container.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create checkbox controls div
        const controlsDiv = d3.select('#xEngagementGraph')
            .append('div')
            .attr('class', 'metric-controls')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '10px');

        // Create SVG
        const svg = d3.select('#xEngagementGraph')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Set up scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.parsedDate))
            .range([0, width]);

        // Initial y scale
        const y = d3.scaleLinear()
            .range([height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(x)
            .ticks(d3.timeDay.every(5))
            .tickFormat(d3.timeFormat('%b %d'));

        const yAxis = d3.axisLeft(y);

        // Add X axis
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        // Add Y axis
        svg.append('g')
            .attr('class', 'y-axis');

        // Add Y axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Count');

        // Define line colors
        const colors = {
            Engagements: '#1DA1F2', // Twitter/X blue
            Impressions: '#FF9900', // Orange
            Likes: '#FF3366'        // Pink
        };

        // Create line generators for each metric
        const createLine = (metric) => {
            return d3.line()
                .x(d => x(d.parsedDate))
                .y(d => y(d[metric]))
                .curve(d3.curveMonotoneX);
        };

        // Add lines for each metric
        const metrics = ['Engagements', 'Impressions', 'Likes'];
        const paths = {};
        const visibleMetrics = new Set(metrics); // Track which metrics are visible

        // Function to update y scale based on visible metrics
        function updateYScale(filteredData = data) {
            const yMax = d3.max(filteredData, d => {
                return Math.max(...Array.from(visibleMetrics).map(metric => d[metric]));
            }) * 1.1;
            
            y.domain([0, yMax]);
            svg.select('.y-axis')
                .transition()
                .duration(750)
                .call(yAxis);
        }

        // Initial y scale update
        updateYScale();
        
        metrics.forEach(metric => {
            // Add the line path
            paths[metric] = svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', colors[metric])
                .attr('stroke-width', 2.5)
                .attr('d', createLine(metric));
            
            // Add gradient area under the line
            const areaGenerator = d3.area()
                .x(d => x(d.parsedDate))
                .y0(height)
                .y1(d => y(d[metric]))
                .curve(d3.curveMonotoneX);

            // Create gradient
            const gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', `area-gradient-${metric}`)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', 0).attr('y1', 0)
                .attr('x2', 0).attr('y2', height);

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', `${colors[metric]}` + '70'); // 70 = 44% opacity

            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', `${colors[metric]}` + '1A'); // 1A = 10% opacity

            // Add the area with reduced opacity
            svg.append('path')
                .datum(data)
                .attr('class', `area-${metric}`)
                .attr('fill', `url(#area-gradient-${metric})`)
                .attr('opacity', 0.5)
                .attr('d', areaGenerator);

            // Add checkbox control
            const controlDiv = controlsDiv.append('div')
                .style('margin', '5px')
                .style('color', 'white')
                .style('background-color', 'rgba(0,0,0,0.7)')
                .style('padding', '5px')
                .style('border-radius', '4px');

            controlDiv.append('input')
                .attr('type', 'checkbox')
                .attr('id', `checkbox-${metric}`)
                .attr('checked', true)
                .on('change', function() {
                    const isVisible = this.checked;
                    if (isVisible) {
                        visibleMetrics.add(metric);
                    } else {
                        visibleMetrics.delete(metric);
                    }

                    // Update visibility
                    paths[metric].style('display', isVisible ? null : 'none');
                    svg.selectAll(`.dot-${metric}`).style('display', isVisible ? null : 'none');
                    svg.select(`.area-${metric}`).style('display', isVisible ? null : 'none');

                    // Update y scale when visibility changes
                    updateYScale();

                    // Update all visible lines and areas with new scale
                    metrics.forEach(m => {
                        if (visibleMetrics.has(m)) {
                            paths[m].transition()
                                .duration(750)
                                .attr('d', createLine(m));
                            
                            svg.select(`.area-${m}`)
                                .transition()
                                .duration(750)
                                .attr('d', d3.area()
                                    .x(d => x(d.parsedDate))
                                    .y0(height)
                                    .y1(d => y(d[m]))
                                    .curve(d3.curveMonotoneX));

                            // Update dots
                            svg.selectAll(`.dot-${m}`)
                                .transition()
                                .duration(750)
                                .attr('cy', d => y(d[m]));
                        }
                    });
                });

            controlDiv.append('label')
                .attr('for', `checkbox-${metric}`)
                .style('margin-left', '5px')
                .style('color', colors[metric])
                .text(metric);
        });

        // Add dots for data points for each metric
        metrics.forEach(metric => {
            svg.selectAll(`.dot-${metric}`)
                .data(data)
                .enter()
                .append('circle')
                .attr('class', `dot dot-${metric}`)
                .attr('cx', d => x(d.parsedDate))
                .attr('cy', d => y(d[metric]))
                .attr('r', 4)
                .attr('fill', colors[metric])
                .attr('stroke', '#fff')
                .attr('stroke-width', 1.5);
        });

        // Create tooltip
        const tooltip = d3.select('#xEngagementGraph')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('pointer-events', 'none')
            .style('font-size', '12px')
            .style('z-index', 10);

        // Add hover effects to all dots
        svg.selectAll('.dot').on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 7)
                .attr('stroke-width', 2);

            tooltip.transition()
                .duration(200)
                .style('opacity', 1);

            tooltip.html(`
                <strong>Date:</strong> ${d.Date.replace(/"/g, '')}<br>
                <strong>Engagements:</strong> ${d.Engagements}<br>
                <strong>Impressions:</strong> ${d.Impressions}<br>
                <strong>Likes:</strong> ${d.Likes}<br>
                <strong>Replies:</strong> ${d.Replies}<br>
                <strong>Reposts:</strong> ${d.Reposts}<br>
                <strong>New Follows:</strong> ${d.NewFollows}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 4)
                .attr('stroke-width', 1.5);

            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
    }
});
