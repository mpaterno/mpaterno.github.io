// Meme Coin Price Chart
document.addEventListener('DOMContentLoaded', function() {
  // Available meme coins
  const memeCoins = ['doge', 'shib', 'floki', 'pepe', 'bonk'];
  let selectedCoin = 'doge'; // Default coin
  let timeRange = '3m'; // Default time range changed to 3 months

  // Create coin selector
  const chartContainer = document.getElementById('priceChart');
  const selectorContainer = document.createElement('div');
  selectorContainer.className = 'coin-selector';
  
  memeCoins.forEach(coin => {
    const button = document.createElement('button');
    button.className = 'coin-button' + (coin === selectedCoin ? ' active' : '');
    button.textContent = coin.toUpperCase();
    button.addEventListener('click', () => {
      document.querySelectorAll('.coin-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      selectedCoin = coin;
      loadCoinData(selectedCoin, timeRange);
    });
    selectorContainer.appendChild(button);
  });
  
  chartContainer.parentNode.insertBefore(selectorContainer, chartContainer);

  // Function to load coin data
  function loadCoinData(coin, timeRange) {
    fetch(`./data/meme-coins/${coin}.json`)
      .then(response => response.json())
      .then(data => {
        const priceData = processData(data, timeRange);
        createChart(priceData);
      })
      .catch(error => {
        console.error('Error loading coin data:', error);
        chartContainer.innerHTML = '<p>Error loading data</p>';
      });
  }

  // Process the data based on time range
  function processData(data, timeRange) {
    const now = Date.now() / 1000; // current timestamp in seconds
    let period;
    if (timeRange === '3m') {
      period = 90 * 24 * 60 * 60;
    } else if (timeRange === '1y') {
      period = 365 * 24 * 60 * 60;
    } else if (timeRange === '5y') {
      period = 5 * 365 * 24 * 60 * 60;
    } else {
      period = 90 * 24 * 60 * 60;
    }
    
    const pointsObj = data.data.points;
    const dataArray = Object.entries(pointsObj)
      .map(([timestamp, point]) => {
        if (point && point.c && point.c.length > 0) {
          return {
            date: new Date(parseInt(timestamp) * 1000),
            price: point.c[0]
          };
        } else {
          console.warn('Skipping timestamp ' + timestamp + ' due to missing "c" array.');
          return null;
        }
      })
      .filter(d => d !== null);
    
    const filteredData = dataArray.filter(d => (d.date.getTime() / 1000) >= (now - period));
    
    return filteredData.length >= 10 ? filteredData : dataArray;
  }

  // Create the chart with D3
  function createChart(data) {
    // Clear any existing chart
    chartContainer.innerHTML = '';
    
    const width = chartContainer.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    
    const svg = d3.select('#priceChart')
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Set up scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([margin.left, width - margin.right]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.price) * 1.1]) // Add 10% padding
      .range([height - margin.bottom, margin.top]);
    
    // Add the line path
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.price))
      .curve(d3.curveMonotoneX);
    
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#0f6cbd')
      .attr('stroke-width', 2)
      .attr('d', line);
      
    // Add points
    svg.selectAll('.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.price))
      .attr('r', 3)
      .attr('fill', '#0f6cbd');
    
    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5));
    
    // Add y-axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
      
    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat('')
      );
    
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${margin.left},0)`)
      .call(
        d3.axisLeft(y)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat('')
      );
    
    // Style the grid lines
    svg.selectAll('.grid line')
      .attr('stroke', '#ddd')
      .attr('stroke-opacity', 0.7)
      .attr('shape-rendering', 'crispEdges');
    
    svg.selectAll('.grid path')
      .style('stroke-width', 0);
  }

  // Handle time range selection
  document.querySelectorAll('.time-button').forEach(button => {
    button.addEventListener('click', () => {
      const parent = button.parentElement;
      parent.querySelectorAll('.time-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Get the time range from the button text
      timeRange = button.textContent.toLowerCase();
      loadCoinData(selectedCoin, timeRange);
    });
  });

  // Load the default coin data
  loadCoinData(selectedCoin, timeRange);
}); 