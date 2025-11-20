/**
 * Choropleth Map Module
 * Creates an interactive Europe map showing HICP inflation data
 */

let currentYear = 2024;
let currentCategory = "Total";
let hicpData = null;
let svg = null;
let projection = null;
let path = null;
let colorScale = null;
let tooltip = null;

// Country name mapping from Portuguese to English (for TopoJSON matching)
const countryNameMap = {
    "Alemanha": "Germany",
    "Áustria": "Austria",
    "Bélgica": "Belgium",
    "Bulgária": "Bulgaria",
    "Chipre": "Cyprus",
    "Croácia": "Croatia",
    "Dinamarca": "Denmark",
    "Eslováquia": "Slovakia",
    "Eslovénia": "Slovenia",
    "Espanha": "Spain",
    "Estónia": "Estonia",
    "Finlândia": "Finland",
    "França": "France",
    "Grécia": "Greece",
    "Hungria": "Hungary",
    "Irlanda": "Ireland",
    "Islândia": "Iceland",
    "Itália": "Italy",
    "Letónia": "Latvia",
    "Lituânia": "Lithuania",
    "Luxemburgo": "Luxembourg",
    "Malta": "Malta",
    "Noruega": "Norway",
    "Países Baixos": "Netherlands",
    "Polónia": "Poland",
    "Portugal": "Portugal",
    "Reino Unido": "United Kingdom",
    "República Checa": "Czechia",
    "Roménia": "Romania",
    "Suécia": "Sweden",
    "Suíça": "Switzerland"
};

/**
 * Create choropleth map
 */
export async function createChoroplethMap(data) {
    hicpData = data;

    const container = d3.select("#viz-choropleth-map");
    container.selectAll("*").remove();

    const containerWidth = container.node().getBoundingClientRect().width;
    const width = Math.min(containerWidth - 40, 1000);
    const height = 700;

    // Create SVG
    svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Create projection for Europe
    projection = d3.geoMercator()
        .center([15, 54])
        .scale(width * 0.55)
        .translate([width / 2, height / 2]);

    path = d3.geoPath().projection(projection);

    // Create color scale
    updateColorScale();

    // Create tooltip
    tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip")
        .style("opacity", 0);

    // Load and draw map
    try {
        const europeGeoJSON = await loadEuropeGeoJSON();
        drawMap(europeGeoJSON);
    } catch (error) {
        console.error("Error loading map:", error);
        container.append("p")
            .style("color", "red")
            .text("Erro ao carregar o mapa da Europa.");
    }

    // Add legend
    addLegend();
}

/**
 * Load Europe GeoJSON
 * Uses a simplified approach by creating basic geometries
 */
async function loadEuropeGeoJSON() {
    // For now, we'll use TopoJSON from a CDN
    // In production, you'd want to host this file locally
    const url = "https://unpkg.com/world-atlas@2/countries-50m.json";

    try {
        const topology = await d3.json(url);
        const countries = topojson.feature(topology, topology.objects.countries);

        // Filter to only European countries (approximate bbox)
        countries.features = countries.features.filter(d => {
            const centroid = d3.geoCentroid(d);
            const lon = centroid[0];
            const lat = centroid[1];
            // Rough European bounding box
            return lon >= -25 && lon <= 45 && lat >= 35 && lat <= 72;
        });

        return countries;
    } catch (error) {
        console.error("Error loading TopoJSON:", error);
        throw error;
    }
}

/**
 * Draw the map
 */
function drawMap(geoData) {
    const g = svg.append("g");

    // Draw countries
    g.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "country")
        .attr("fill", d => getCountryColor(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseover", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseout", handleMouseOut);
}

/**
 * Get color for a country based on current data
 */
function getCountryColor(feature) {
    const countryName = getCountryName(feature);
    if (!countryName) return "#e0e0e0";

    const yearData = hicpData.data[currentYear];
    if (!yearData || !yearData[countryName]) return "#e0e0e0";

    const value = yearData[countryName][currentCategory];
    if (!value) return "#e0e0e0";

    return colorScale(value);
}

/**
 * Try to match country name from GeoJSON to our data
 */
function getCountryName(feature) {
    const name = feature.properties.name;

    // Check if it's a direct match (English name)
    if (hicpData.countries.includes(name)) return name;

    // Check Portuguese name mapping
    for (const [portuguese, english] of Object.entries(countryNameMap)) {
        if (english === name && hicpData.countries.includes(portuguese)) {
            return portuguese;
        }
    }

    return null;
}

/**
 * Update color scale based on current data range
 */
function updateColorScale() {
    const yearData = hicpData.data[currentYear];
    if (!yearData) return;

    const values = [];
    Object.values(yearData).forEach(countryData => {
        const value = countryData[currentCategory];
        if (value) values.push(value);
    });

    const min = d3.min(values);
    const max = d3.max(values);

    // Use a color scheme from light to dark red/orange
    colorScale = d3.scaleSequential()
        .domain([min, max])
        .interpolator(d3.interpolateYlOrRd);
}

/**
 * Mouse event handlers
 */
function handleMouseOver(event, d) {
    d3.select(event.currentTarget)
        .attr("stroke", "#333")
        .attr("stroke-width", 2);

    const countryName = getCountryName(d);
    if (!countryName) return;

    const yearData = hicpData.data[currentYear];
    const value = yearData?.[countryName]?.[currentCategory];

    tooltip.transition()
        .duration(200)
        .style("opacity", 0.95);

    tooltip.html(`
        <strong>${countryName}</strong><br/>
        ${currentCategory}<br/>
        Ano: ${currentYear}<br/>
        <span style="color: #e74c3c; font-weight: bold;">
            Índice: ${value ? value.toFixed(1) : 'N/A'}
        </span>
    `);
}

function handleMouseMove(event) {
    tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function handleMouseOut(event) {
    d3.select(event.currentTarget)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

    tooltip.transition()
        .duration(500)
        .style("opacity", 0);
}

/**
 * Add legend to the map
 */
function addLegend() {
    const legendWidth = 300;
    const legendHeight = 20;
    const svgWidth = parseInt(svg.attr("width"));
    const svgHeight = parseInt(svg.attr("height"));
    const legendX = (svgWidth - legendWidth) / 2;
    const legendY = svgHeight - 50;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    // Create gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient");

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
        gradient.append("stop")
            .attr("offset", `${(i / numStops) * 100}%`)
            .attr("stop-color", colorScale.interpolator()(i / numStops));
    }

    // Draw legend rectangle
    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    // Add legend labels
    const [min, max] = colorScale.domain();

    legendGroup.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 15)
        .attr("font-size", "11px")
        .attr("fill", "#333")
        .text(min.toFixed(0));

    legendGroup.append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "end")
        .attr("font-size", "11px")
        .attr("fill", "#333")
        .text(max.toFixed(0));

    legendGroup.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", "#333")
        .text("Índice HICP");
}

/**
 * Update map with new year and/or category
 */
export function updateChoroplethMap(year, category) {
    currentYear = year;
    currentCategory = category;

    updateColorScale();

    // Update country colors
    svg.selectAll(".country")
        .transition()
        .duration(500)
        .attr("fill", d => getCountryColor(d));

    // Update legend
    svg.selectAll("defs").remove();
    svg.selectAll("g").filter(function() {
        return d3.select(this).select("rect").size() > 0;
    }).remove();

    addLegend();
}

/**
 * Setup year and category selectors
 */
export function setupChoroplethControls(data) {
    hicpData = data;

    // Year selector
    const yearSelect = d3.select("#map-year-select");
    yearSelect.selectAll("option")
        .data(data.years)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d)
        .property("selected", d => d === currentYear);

    yearSelect.on("change", function() {
        currentYear = +this.value;
        updateChoroplethMap(currentYear, currentCategory);
    });

    // Category selector
    const categorySelect = d3.select("#map-category-select");
    categorySelect.selectAll("option")
        .data(data.categories)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d)
        .property("selected", d => d === currentCategory);

    categorySelect.on("change", function() {
        currentCategory = this.value;
        updateChoroplethMap(currentYear, currentCategory);
    });
}
