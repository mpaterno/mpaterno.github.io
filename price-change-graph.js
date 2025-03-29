const parseDate = d3.timeParse("%Y-%m-%d");

// Create container elements instead of appending directly to body
const chartContainer = document.getElementById('priceChangeGraph') || document.body;
let selectedTimeRange = '3m';
let selectedChangeType = 'daily'; // New variable to track selected change type

// Create time filter buttons
const filterContainer = document.createElement('div');
filterContainer.className = 'time-filters';
['3m', '1y', '5y'].forEach(range => {
    const btn = document.createElement('button');
    btn.className = 'time-button' + (range === selectedTimeRange ? ' active' : '');
    btn.textContent = range;
    btn.addEventListener('click', function() {
        filterContainer.querySelectorAll('.time-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTimeRange = range;
        updateChart();
    });
    filterContainer.appendChild(btn);
});
chartContainer.parentNode.insertBefore(filterContainer, chartContainer);

// Create change type toggle
const toggleContainer = document.createElement('div');
toggleContainer.className = 'change-type-toggle';
toggleContainer.style.marginTop = '10px';

const toggleLabel = document.createElement('label');
toggleLabel.innerHTML = 'View: ';
toggleLabel.style.marginRight = '10px';
toggleContainer.appendChild(toggleLabel);

// Daily button
const dailyBtn = document.createElement('button');
dailyBtn.className = 'toggle-button active';
dailyBtn.textContent = 'Daily';
dailyBtn.addEventListener('click', function() {
    if (selectedChangeType !== 'daily') {
        dailyBtn.classList.add('active');
        weeklyBtn.classList.remove('active');
        selectedChangeType = 'daily';
        updateChart();
    }
});
toggleContainer.appendChild(dailyBtn);

// 7-Day button
const weeklyBtn = document.createElement('button');
weeklyBtn.className = 'toggle-button';
weeklyBtn.textContent = '7-Day';
weeklyBtn.addEventListener('click', function() {
    if (selectedChangeType !== 'weekly') {
        weeklyBtn.classList.add('active');
        dailyBtn.classList.remove('active');
        selectedChangeType = 'weekly';
        updateChart();
    }
});
toggleContainer.appendChild(weeklyBtn);

// Insert toggle container after filter container
chartContainer.parentNode.insertBefore(toggleContainer, chartContainer);

// Setup chart dimensions with margins
const containerWidth = chartContainer.offsetWidth || 800;
const margin = { top: 30, right: 30, bottom: 60, left: 50 };
const width = containerWidth - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create tooltip
let tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background-color', 'rgba(0, 0, 0, 0.8)')
    .style('color', 'white')
    .style('padding', '8px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none');

// Create SVG with proper margins
const svg = d3.select(chartContainer)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function updateChart() {
    // Clear existing chart
    svg.selectAll('*').remove();

    Promise.all([
        d3.csv('data/bitcoin-price-change.csv'),
        d3.csv('data/meme-coins/simplified-prices.csv')
    ]).then(function([btcData, memeData]) {
        // Process Bitcoin data: parse date and cast change to number
        btcData.forEach(d => {
            d.date = parseDate(d.date);
            // Use the appropriate change field based on selection
            if (selectedChangeType === 'daily') {
                d.change = +d.pct_change;
            } else {
                d.change = +d.seven_d_pct_change; // Assuming this field exists in the data
            }
        });
        btcData = btcData.filter(d => !isNaN(d.change) && d.date !== null);

        // Process Meme Coin data: parse date and convert avg_pct_change to number
        memeData.forEach(d => {
            d.date = parseDate(d.date);
            // Use the appropriate change field based on selection
            if (selectedChangeType === 'daily') {
                d.change = +d.avg_pct_change;
            } else {
                d.change = +d.seven_d_avg_pct_change; // Assuming this field exists in the data
            }
        });
        memeData = memeData.filter(d => !isNaN(d.change) && d.date !== null);

        // Apply time filtering
        const now = new Date();
        let period;
        if (selectedTimeRange === '3m') {
            period = 90 * 24 * 60 * 60 * 1000;
        } else if (selectedTimeRange === '1y') {
            period = 365 * 24 * 60 * 60 * 1000;
        } else if (selectedTimeRange === '5y') {
            period = 5 * 365 * 24 * 60 * 60 * 1000;
        }

        const cutoffDate = new Date(now.getTime() - period);
        let filteredBtcData = btcData.filter(d => d.date >= cutoffDate);
        let filteredMemeData = memeData.filter(d => d.date >= cutoffDate);

        // If filtered data is too small, use all data
        if (filteredBtcData.length < 10) filteredBtcData = btcData;
        if (filteredMemeData.length < 10) filteredMemeData = memeData;

        // Determine x-axis domain by combining dates from both datasets
        const allDates = filteredBtcData.map(d => d.date).concat(filteredMemeData.map(d => d.date));
        const xExtent = d3.extent(allDates);

        // Determine y-axis domain by combining percentage change values
        const allChanges = filteredBtcData.map(d => d.change).concat(filteredMemeData.map(d => d.change));
        const yExtent = d3.extent(allChanges);

        // Set up scales
        const xScale = d3.scaleTime()
            .domain(xExtent)
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0], yExtent[1]])
            .range([height, 0]);

        // Create and append axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(width < 600 ? 4 : 6)
            .tickFormat(d3.timeFormat('%Y-%m'));

        const yAxis = d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(d => d + '%');

        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .style('font-size', '12px')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
            .selectAll('text')
            .style('font-size', '12px');

        // Define line generators for both datasets
        const btcLine = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.change))
            .curve(d3.curveMonotoneX);

        const memeLine = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.change))
            .curve(d3.curveMonotoneX);

        // Append Bitcoin percentage change line
        svg.append('path')
            .datum(filteredBtcData)
            .attr('class', 'line bitcoin')
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2)
            .attr('d', btcLine);

        // Append Meme Coin percentage change line
        svg.append('path')
            .datum(filteredMemeData)
            .attr('class', 'line meme')
            .attr('fill', 'none')
            .attr('stroke', 'orange')
            .attr('stroke-width', 2)
            .attr('d', memeLine);

        // Add dots with hover effect for Bitcoin
        svg.selectAll('.dot-btc')
            .data(filteredBtcData)
            .enter()
            .append('circle')
            .attr('class', 'dot-btc')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.change))
            .attr('r', 4)
            .attr('fill', 'steelblue')
            .style('opacity', 0)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6)
                    .style('opacity', 1);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                
                const changeLabel = selectedChangeType === 'daily' ? 'Daily' : '7-Day';
                tooltip.html(`Date: ${d3.timeFormat('%Y-%m-%d')(d.date)}<br/>Bitcoin ${changeLabel} % Change: ${d.change.toFixed(2)}%`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4)
                    .style('opacity', 0);

                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Add dots with hover effect for Meme Coins
        svg.selectAll('.dot-meme')
            .data(filteredMemeData)
            .enter()
            .append('circle')
            .attr('class', 'dot-meme')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.change))
            .attr('r', 4)
            .attr('fill', 'orange')
            .style('opacity', 0)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6)
                    .style('opacity', 1);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                
                const changeLabel = selectedChangeType === 'daily' ? 'Daily' : '7-Day';
                tooltip.html(`Date: ${d3.timeFormat('%Y-%m-%d')(d.date)}<br/>Meme Coin ${changeLabel} % Change: ${d.change.toFixed(2)}%`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4)
                    .style('opacity', 0);

                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - 150}, 10)`);

        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 140)
            .attr('height', 60)
            .attr('fill', 'rgba(255,255,255,0.7)')
            .attr('rx', 5);

        legend.append('rect')
            .attr('x', 10)
            .attr('y', 10)
            .attr('width', 20)
            .attr('height', 3)
            .attr('fill', 'steelblue');

        legend.append('text')
            .attr('x', 35)
            .attr('y', 15)
            .attr('class', 'legend bitcoin')
            .style('font-size', '12px')
            .text('Bitcoin % Change');

        legend.append('rect')
            .attr('x', 10)
            .attr('y', 30)
            .attr('width', 20)
            .attr('height', 3)
            .attr('fill', 'orange');

        legend.append('text')
            .attr('x', 35)
            .attr('y', 35)
            .attr('class', 'legend meme')
            .style('font-size', '12px')
            .text('Meme Coin % Change');

        // Update legend text based on selected change type
        const changeLabel = selectedChangeType === 'daily' ? 'Daily' : '7-Day';
        legend.select('.legend.bitcoin')
            .text(`Bitcoin ${changeLabel} % Change`);

        legend.select('.legend.meme')
            .text(`Meme Coin ${changeLabel} % Change`);

        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text(`Bitcoin vs Meme Coins ${changeLabel} Price Change`);

    }).catch(function(error) {
        console.error('Error loading CSV data:', error);
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', 'red')
            .text('Error loading data. Check console for details.');
    });
}

// Initial chart render
updateChart();