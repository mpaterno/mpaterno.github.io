// Doge Price Graph with X Engagement
document.addEventListener('DOMContentLoaded', function() {

    // Load both price and engagement data
    Promise.all([
        d3.csv('data/meme-coins/simplified-prices.csv'),
        d3.csv('data/account_overview_analytics_phicoin.csv')
    ]).then(([priceData, engagementData]) => {
        createDogePriceGraph(priceData, engagementData);
    }).catch(error => {
        console.error('Error loading data:', error);
        document.getElementById('dogePriceGraph').innerHTML = '<p>Error loading data</p>';
    });

    // Compute Pearson Correlation
    function computePearsonCorrelation(data1, data2) {
        const n = data1.length;
        const mean1 = d3.mean(data1);
        const mean2 = d3.mean(data2);
    
        const numerator = d3.sum(data1.map((x, i) => (x - mean1) * (data2[i] - mean2)));
        const denominator = Math.sqrt(
            d3.sum(data1.map(x => Math.pow(x - mean1, 2))) *
            d3.sum(data2.map(y => Math.pow(y - mean2, 2)))
        );
    
        return denominator === 0 ? 0 : numerator / denominator;
    }

    function createDogePriceGraph(priceData, engagementData) {
        // Parse price data
        priceData.forEach(d => {
            d.date = new Date(d.date);
            d.doge = +d.doge;
        });

        // Parse engagement data
        engagementData.forEach(d => {
            const dateParts = d.Date.replace(/"/g, '').match(/\w+, (\w+) (\d+), (\d+)/);
            if (dateParts) {
                const month = dateParts[1];
                const day = parseInt(dateParts[2]);
                const year = parseInt(dateParts[3]);
                d.parsedDate = new Date(`${month} ${day}, ${year}`);
                d.Engagements = +d.Engagements;
            }
        });

        // Filter out null and 0 values
        priceData = priceData.filter(d => d.doge !== null && d.doge !== 0);

        // Set up dimensions
        const container = document.getElementById('dogePriceGraph');
        const margin = {top: 40, right: 80, bottom: 90, left: 60};
        const width = container.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create time filter buttons
        const filterContainer = document.createElement('div');
        filterContainer.className = 'time-selector';
        const timePeriods = ['1m', '3m', '6m', '9m'];
        let selectedPeriod = '3m';

        timePeriods.forEach(period => {
            const btn = document.createElement('button');
            btn.className = `time-button ${period === selectedPeriod ? 'active' : ''}`;
            btn.textContent = period.toUpperCase();
            btn.addEventListener('click', function() {
                filterContainer.querySelectorAll('.time-button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedPeriod = period;
                updateChart(period);
            });
            filterContainer.appendChild(btn);
        });

        container.appendChild(filterContainer);

        // Create SVG
        const svg = d3.select('#dogePriceGraph')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Set up scales
        const x = d3.scaleTime()
            .range([0, width]);

        const y = d3.scaleLinear()
            .range([height, 0]);

        const r = d3.scaleSqrt()
            .range([3, 15]);

        // Add axes
        const xAxis = svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`);

        const yAxis = svg.append('g')
            .attr('class', 'y-axis');

        // Add labels
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Doge Price Over Time (Circle size = X Engagements)');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text('Price (USD)');

        // Create line and area
        const line = svg.append('path')
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke', '#FF9900')
            .attr('stroke-width', 2.5);

        const area = svg.append('path')
            .attr('class', 'area')
            .attr('fill', 'url(#area-gradient)');

        // Create gradient
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'area-gradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', height);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#FF990070');

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#FF99001A');

        // Create correlation gauge
        const gaugeWidth = 120;
        const gaugeHeight = 60;
        const gaugeX = width - gaugeWidth;
        const gaugeY = -30;
        
        // Create gauge container
        const gauge = svg.append('g')
            .attr('class', 'correlation-gauge')
            .attr('transform', `translate(${gaugeX}, ${gaugeY})`);
            
        // Add gauge background
        gauge.append('rect')
            .attr('width', gaugeWidth)
            .attr('height', gaugeHeight)
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('fill', '#f5f5f5')
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1);
            
        // Add gauge title
        gauge.append('text')
            .attr('x', gaugeWidth / 2)
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Correlation');
            
        // Add gauge scale
        const scaleWidth = gaugeWidth - 20;
        const scaleHeight = 8;
        const scaleX = 10;
        const scaleY = 30;
        
        // Create gradient for gauge
        const gaugeGradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'gauge-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');
            
        gaugeGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#d9534f');  // Negative correlation (red)
            
        gaugeGradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', '#f0ad4e');  // No correlation (yellow)
            
        gaugeGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#5cb85c');  // Positive correlation (green)
            
        // Add gauge background
        gauge.append('rect')
            .attr('x', scaleX)
            .attr('y', scaleY)
            .attr('width', scaleWidth)
            .attr('height', scaleHeight)
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('fill', 'url(#gauge-gradient)');
            
        // Add scale markers
        [-1, -0.5, 0, 0.5, 1].forEach((value, i) => {
            const markerX = scaleX + (scaleWidth * (value + 1) / 2);
            
            // Add tick mark
            gauge.append('line')
                .attr('x1', markerX)
                .attr('x2', markerX)
                .attr('y1', scaleY + scaleHeight)
                .attr('y2', scaleY + scaleHeight + 5)
                .attr('stroke', '#666')
                .attr('stroke-width', 1);
                
            // Add label
            gauge.append('text')
                .attr('x', markerX)
                .attr('y', scaleY + scaleHeight + 15)
                .attr('text-anchor', 'middle')
                .style('font-size', '9px')
                .text(value);
        });
        
        // Add pointer (will be updated with correlation value)
        const pointer = gauge.append('polygon')
            .attr('fill', '#333')
            .attr('stroke', 'none');
            
        // Add correlation value text
        const correlationText = gauge.append('text')
            .attr('x', gaugeWidth / 2)
            .attr('y', scaleY + scaleHeight + 30)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold');

        function updateChart(period) {
            // Filter data based on selected time period
            const now = new Date();
            const monthsAgo = new Date(now.setMonth(now.getMonth() - parseInt(period)));
            const filteredPriceData = priceData.filter(d => d.date >= monthsAgo);
            const filteredEngagementData = engagementData.filter(d => d.parsedDate >= monthsAgo);

            // Update scales
            x.domain(d3.extent(filteredPriceData, d => d.date));
            y.domain([0, d3.max(filteredPriceData, d => d.doge) * 1.1]);
            r.domain([0, d3.max(filteredEngagementData, d => d.Engagements)]);

            // Update axes
            xAxis.transition().duration(750).call(d3.axisBottom(x));
            yAxis.transition().duration(750).call(d3.axisLeft(y));

            // Update line
            line.datum(filteredPriceData)
                .transition()
                .duration(750)
                .attr('d', d3.line()
                    .x(d => x(d.date))
                    .y(d => y(d.doge))
                    .curve(d3.curveMonotoneX));

            // Update area
            area.datum(filteredPriceData)
                .transition()
                .duration(750)
                .attr('d', d3.area()
                    .x(d => x(d.date))
                    .y0(height)
                    .y1(d => y(d.doge))
                    .curve(d3.curveMonotoneX));

            // Update engagement circles
            const circles = svg.selectAll('circle')
                .data(filteredEngagementData);

            circles.exit().remove();

            circles.enter()
                .append('circle')
                .merge(circles)
                .transition()
                .duration(750)
                .attr('cx', d => x(d.parsedDate))
                .attr('cy', d => {
                    const pricePoint = filteredPriceData.find(p => 
                        p.date.toDateString() === d.parsedDate.toDateString()
                    );
                    return pricePoint ? y(pricePoint.doge) : height;
                })
                .attr('r', d => r(d.Engagements))
                .attr('fill', '#1DA1F2')
                .attr('fill-opacity', 0.5)
                .attr('stroke', '#1DA1F2')
                .attr('stroke-width', 1);

            // Calculate and update correlation
            const matchedData = filteredEngagementData.map(d => {
                const pricePoint = filteredPriceData.find(p => 
                    p.date.toDateString() === d.parsedDate.toDateString()
                );
                return pricePoint ? {engagement: d.Engagements, price: pricePoint.doge} : null;
            }).filter(d => d !== null);

            if (matchedData.length > 1) {
                const correlation = computePearsonCorrelation(
                    matchedData.map(d => d.engagement),
                    matchedData.map(d => d.price)
                );
                
                // Update correlation text
                correlationText.text(correlation.toFixed(2));
                
                // Update pointer position
                const pointerX = scaleX + (scaleWidth * (correlation + 1) / 2);
                pointer
                    .transition()
                    .duration(750)
                    .attr('points', `${pointerX},${scaleY - 5} ${pointerX - 5},${scaleY - 12} ${pointerX + 5},${scaleY - 12}`);
                    
                // Update pointer color based on correlation value
                let pointerColor;
                if (correlation < -0.3) pointerColor = '#d9534f';
                else if (correlation > 0.3) pointerColor = '#5cb85c';
                else pointerColor = '#f0ad4e';
                
                pointer.attr('fill', pointerColor);
            } else {
                correlationText.text('N/A');
                pointer.attr('points', '');
            }
        }

        // Initial chart render
        updateChart(selectedPeriod);
    }
});
