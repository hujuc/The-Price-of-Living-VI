import { countryNameMap } from './country-name-map.js';
import { renderEmptyState } from './empty-state.js';

/**
 * Choropleth Map Module
 * Creates an interactive Europe map showing HICP inflation data
 */

let currentYear = 2024;
let currentCategory = "Total";
let currentCountry = "Portugal";
let hicpData = null;
let svg = null;
let projection = null;
let path = null;
let colorScale = null;
let tooltip = null;
let selectedCountryValue = null;
let colorScaleMode = "sequential";
let maxDifference = 0;

function resolveDatasetCountryName(country) {
    if (!country || !hicpData?.countries) {
        return country;
    }

    if (hicpData.countries.includes(country)) {
        return country;
    }

    for (const [portuguese, english] of Object.entries(countryNameMap)) {
        if (country === portuguese && hicpData.countries.includes(portuguese)) {
            return portuguese;
        }
        if (country === english && hicpData.countries.includes(portuguese)) {
            return portuguese;
        }
    }

    return country;
}

function getSelectedCountryNames() {
    const datasetName = resolveDatasetCountryName(currentCountry) || currentCountry;
    const englishName = countryNameMap[datasetName] || datasetName;
    const displayName = datasetName;

    return {
        dataset: datasetName,
        english: englishName,
        display: displayName
    };
}

function isFeatureSelected(feature) {
    const { english } = getSelectedCountryNames();
    return feature?.properties?.name === english;
}

function updateSelectedCountryHighlight() {
    if (!svg) {
        return;
    }

    svg.selectAll(".country")
        .classed("selected-country", d => isFeatureSelected(d));
}

function updateCountrySummary() {
    const summaryContainer = d3.select("#map-country-summary");
    if (summaryContainer.empty()) {
        return;
    }

    if (!hicpData?.data || !hicpData.data[currentYear]) {
        summaryContainer
            .attr("class", "map-country-summary empty")
            .html(renderEmptyState({
                title: "Sem dados disponíveis",
                message: "Ainda não temos valores de HICP para o ano selecionado.",
                meta: "Escolha outro ano acima para continuar a exploração.",
                icon: "🗺️"
            }));
        return;
    }

    const { dataset, display } = getSelectedCountryNames();
    const yearData = hicpData.data[currentYear];
    const countryData = yearData?.[dataset];
    const value = countryData?.[currentCategory];

    const values = [];
    const diffs = [];
    let minDiff = null;
    let maxDiff = null;
    let minDiffCountry = null;
    let maxDiffCountry = null;

    Object.entries(yearData).forEach(([countryName, countryEntry]) => {
        const v = countryEntry?.[currentCategory];
        if (v != null && !isNaN(v)) {
            values.push(v);
            if (colorScaleMode === "difference" && selectedCountryValue != null) {
                const diffVal = v - selectedCountryValue;
                diffs.push(diffVal);
                if (minDiff === null || diffVal < minDiff) {
                    minDiff = diffVal;
                    minDiffCountry = countryName;
                }
                if (maxDiff === null || diffVal > maxDiff) {
                    maxDiff = diffVal;
                    maxDiffCountry = countryName;
                }
            }
        }
    });

    if (value == null || isNaN(value)) {
        summaryContainer
            .attr("class", "map-country-summary empty")
            .html(renderEmptyState({
                title: `Sem dados para ${display}`,
                message: `Não encontramos valores de ${currentCategory.toLowerCase()} para ${display} em ${currentYear}.`,
                meta: "Tente selecionar outro país ou ano no painel do mapa.",
                icon: "📉"
            }));
        return;
    }

    const minValue = values.length ? d3.min(values) : null;
    const maxValue = values.length ? d3.max(values) : null;
    const mean = values.length ? d3.mean(values) : null;

    summaryContainer
        .attr("class", "map-country-summary")
        .html(`
            <div class="summary-header">
                <div class="summary-title">${display}</div>
                <div class="summary-year-badge">${currentYear}</div>
            </div>
            
            <div class="summary-main-metric">
                <div class="metric-category">${currentCategory}</div>
                <div class="metric-value-large">${value.toFixed(1)}</div>
                <div class="metric-unit">Índice HICP</div>
            </div>
            
            <div class="summary-comparison">
                <div class="comparison-item">
                    <svg class="comparison-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 3v14M10 3l-4 4M10 3l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <div class="comparison-content">
                        <div class="comparison-label">Intervalo Europeu</div>
                        <div class="comparison-value">
                            ${colorScaleMode === "difference" && minDiff !== null && maxDiff !== null
                                ? `<span class="range-min">${minDiff.toFixed(1)}</span> <span class="range-arrow">→</span> <span class="range-max">${maxDiff.toFixed(1)}</span>`
                                : `<span class="range-min">${minValue != null ? minValue.toFixed(1) : '—'}</span> <span class="range-arrow">→</span> <span class="range-max">${maxValue != null ? maxValue.toFixed(1) : '—'}</span>`}
                        </div>
                        <div class="comparison-detail">
                            ${colorScaleMode === "difference" && minDiffCountry && maxDiffCountry
                                ? `${minDiffCountry} (menor) • ${maxDiffCountry} (maior)`
                                : 'Amplitude de valores na Europa'}
                        </div>
                    </div>
                </div>
                
                <div class="comparison-item">
                    <svg class="comparison-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2"/>
                        <path d="M10 6v4l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <div class="comparison-content">
                        <div class="comparison-label">Média Europeia</div>
                        <div class="comparison-value">${mean != null ? mean.toFixed(1) : '—'}</div>
                        <div class="comparison-detail">
                            ${value != null && mean != null 
                                ? (value > mean 
                                    ? `+${(value - mean).toFixed(1)} acima da média`
                                    : `${(value - mean).toFixed(1)} abaixo da média`)
                                : 'Referência continental'}
                        </div>
                    </div>
                </div>
            </div>
        `);
}


/**
 * Create choropleth map
 */
export async function createChoroplethMap(data, country = "Portugal") {
    hicpData = data;
    currentCountry = country;

    if (!hicpData || !hicpData.years?.length || !hicpData.categories?.length) {
        d3.select("#viz-choropleth-map")
            .html(renderEmptyState({
                title: "Mapa sem dados",
                message: "Não conseguimos carregar as séries de inflação harmonizada para esta visualização.",
                meta: "Verifique o ficheiro HICP ou tente recarregar a página.",
                icon: "🗺️"
            }));
        return;
    }

    if (!hicpData.years.includes(currentYear)) {
        currentYear = hicpData.years[hicpData.years.length - 1];
    }

    if (!hicpData.categories.includes(currentCategory)) {
        currentCategory = hicpData.categories[0];
    }

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
    d3.selectAll(".map-tooltip").remove();
    tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip")
        .style("opacity", 0);

    // Load and draw map
    try {
        const europeGeoJSON = await loadEuropeGeoJSON();
        drawMap(europeGeoJSON);
    } catch (error) {
        console.error("Error loading map:", error);
        container.html(renderEmptyState({
            title: "Erro ao carregar o mapa",
            message: "Não foi possível descarregar a geometria da Europa para desenhar a visualização.",
            meta: `Detalhes técnicos: ${error.message}`,
            icon: "⚠️"
        }));
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
            .classed("selected-country", d => isFeatureSelected(d))
        .attr("fill", d => getCountryColor(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseout", handleMouseOut);
}

/**
 * Get color for a country based on current data
 */
function getCountryColor(feature) {
    if (!colorScale) {
        return "#e0e0e0";
    }

    const countryName = getCountryName(feature);
    if (!countryName) {
        return "#e0e0e0";
    }

    const yearData = hicpData.data[currentYear];
    if (!yearData || !yearData[countryName]) {
        return "#e0e0e0";
    }

    const value = yearData[countryName][currentCategory];
    if (value == null || isNaN(value)) {
        return "#e0e0e0";
    }
    if (colorScaleMode === "difference" && selectedCountryValue != null) {
        return colorScale(value - selectedCountryValue);
    }

    return colorScale(value);
}

/**
 * Try to match country name from GeoJSON to our data
 */
function getCountryName(feature) {
    if (!hicpData?.countries?.length) {
        return null;
    }

    const name = feature.properties.name;

    // Check if it's a direct match (English name)
    if (hicpData.countries.includes(name)) {
        return name;
    }

    // Check Portuguese name mapping
    for (const [portuguese, english] of Object.entries(countryNameMap)) {
        if (english === name && hicpData.countries.includes(portuguese)) {
            return portuguese;
        }
        if (portuguese === name && hicpData.countries.includes(portuguese)) {
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
    if (!yearData) {
        colorScale = null;
        selectedCountryValue = null;
        colorScaleMode = "sequential";
        return;
    }

    const values = [];
    Object.values(yearData).forEach(countryData => {
        const value = countryData[currentCategory];
        if (value) {
            values.push(value);
        }
    });

    if (values.length === 0) {
        colorScale = d3.scaleSequential()
            .domain([0, 1])
            .interpolator(d3.interpolateGreys);
        return;
    }

    const sequentialMin = d3.min(values);
    const sequentialMax = d3.max(values);

    // Use a color scheme from light to dark red/orange
    const { dataset } = getSelectedCountryNames();
    const baseValue = yearData?.[dataset]?.[currentCategory];

    const diffs = [];

    Object.values(yearData).forEach(countryData => {
        const value = countryData[currentCategory];
        if (value != null && !isNaN(value) && baseValue != null && !isNaN(baseValue)) {
            diffs.push(value - baseValue);
        }
    });

    if (baseValue != null && !isNaN(baseValue) && diffs.length) {
        const maxAbs = d3.max(diffs.map(d => Math.abs(d)));

        if (maxAbs && maxAbs > 0) {
            selectedCountryValue = baseValue;
            maxDifference = maxAbs;
            colorScaleMode = "difference";
            colorScale = d3.scaleDiverging()
                .domain([-maxAbs, 0, maxAbs])
                .interpolator(t => d3.interpolateRdYlGn(1 - t))
                .clamp(true);
            return;
        }
    }

    selectedCountryValue = null;
    colorScaleMode = "sequential";
    colorScale = d3.scaleSequential()
        .domain([sequentialMin, sequentialMax])
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
    if (!countryName) {
        return;
    }

    const yearData = hicpData.data[currentYear];
    const value = yearData?.[countryName]?.[currentCategory];
    const diff = (colorScaleMode === "difference" && selectedCountryValue != null && value != null && !isNaN(value))
        ? value - selectedCountryValue
        : null;
    const { display } = getSelectedCountryNames();

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
        ${diff !== null ? `<br/><span style="color: ${diff > 0 ? '#e74c3c' : '#27ae60'}; font-weight: 600;">${diff > 0 ? '+' : ''}${diff.toFixed(1)} vs ${display}</span>` : ''}
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
    if (!colorScale) {
        return;
    }

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

    if (colorScaleMode === "difference") {
        const [minDiff, , maxDiff] = colorScale.domain();
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const value = minDiff + (maxDiff - minDiff) * t;
            gradient.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", colorScale(value));
        }
    } else {
        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            gradient.append("stop")
                .attr("offset", `${(i / numStops) * 100}%`)
                .attr("stop-color", colorScale.interpolator()(i / numStops));
        }
    }

    // Draw legend rectangle
    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    if (colorScaleMode === "difference") {
        const [minDiff, , maxDiff] = colorScale.domain();
        const { display } = getSelectedCountryNames();

        legendGroup.append("text")
            .attr("x", 0)
            .attr("y", legendHeight + 15)
            .attr("font-size", "11px")
            .attr("fill", "#27ae60")
            .text(`${minDiff.toFixed(1)} (mais baixo)`);

        legendGroup.append("text")
            .attr("x", legendWidth)
            .attr("y", legendHeight + 15)
            .attr("text-anchor", "end")
            .attr("font-size", "11px")
            .attr("fill", "#e74c3c")
            .text(`${maxDiff.toFixed(1)} (mais alto)`);

        legendGroup.append("line")
            .attr("x1", legendWidth / 2)
            .attr("x2", legendWidth / 2)
            .attr("y1", 0)
            .attr("y2", legendHeight)
            .attr("stroke", "#2c3e50")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,3");

        legendGroup.append("text")
            .attr("x", legendWidth / 2)
            .attr("y", legendHeight + 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#34495e")
            .text("0");

        legendGroup.append("text")
            .attr("x", legendWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", "#333")
            .text(`Diferença vs ${display}`);
    } else {
        const [minValue, maxValue] = colorScale.domain();

        legendGroup.append("text")
            .attr("x", 0)
            .attr("y", legendHeight + 15)
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(minValue.toFixed(0));

        legendGroup.append("text")
            .attr("x", legendWidth)
            .attr("y", legendHeight + 15)
            .attr("text-anchor", "end")
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(maxValue.toFixed(0));

        legendGroup.append("text")
            .attr("x", legendWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", "#333")
            .text("Índice HICP");
    }
}

/**
 * Update map with new year and/or category
 */
export function updateChoroplethMap(year, category) {
    currentYear = year;
    currentCategory = category;

    updateColorScale();

    if (!svg) {
        return;
    }

    const hasYearData = !!hicpData?.data?.[currentYear];
    const hasCategoryData = hasYearData && Object.values(hicpData.data[currentYear]).some(entry => entry?.[currentCategory] != null && !isNaN(entry[currentCategory]));

    if (!hasYearData || !hasCategoryData) {
        svg.selectAll(".country")
            .transition()
            .duration(300)
            .attr("fill", "#e0e0e0");

        svg.selectAll("defs").remove();
        svg.selectAll("g").filter(function() {
            return d3.select(this).select("rect").size() > 0;
        }).remove();

        updateSelectedCountryHighlight();
        updateCountrySummary();
        return;
    }

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
    updateSelectedCountryHighlight();
    updateCountrySummary();
}

/**
 * Setup year and category selectors
 */
export function setupChoroplethControls(data, country = "Portugal") {
    hicpData = data;
    currentCountry = country;

    if (hicpData.years?.length && !hicpData.years.includes(currentYear)) {
        currentYear = hicpData.years[hicpData.years.length - 1];
    }

    if (hicpData.categories?.length && !hicpData.categories.includes(currentCategory)) {
        currentCategory = hicpData.categories[0];
    }

    // Year selector
    const yearSelect = d3.select("#map-year-select");
    yearSelect.selectAll("option").remove();
    yearSelect.on("change", null);

    if (hicpData.years?.length) {
        yearSelect.selectAll("option")
            .data(data.years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d)
            .property("selected", d => d === currentYear);

        yearSelect.property("value", currentYear)
            .attr("disabled", null)
            .classed("disabled", false);

        yearSelect.on("change", function() {
            currentYear = +this.value;
            updateChoroplethMap(currentYear, currentCategory);
        });
    } else {
        yearSelect
            .append("option")
            .attr("value", "")
            .text("Sem anos disponíveis");
        yearSelect
            .attr("disabled", true)
            .classed("disabled", true);
    }

    // Category selector
    const categorySelect = d3.select("#map-category-select");
    categorySelect.selectAll("option").remove();
    categorySelect.on("change", null);

    if (hicpData.categories?.length) {
        categorySelect.selectAll("option")
            .data(data.categories)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d)
            .property("selected", d => d === currentCategory);

        categorySelect.property("value", currentCategory)
            .attr("disabled", null)
            .classed("disabled", false);

        categorySelect.on("change", function() {
            currentCategory = this.value;
            updateChoroplethMap(currentYear, currentCategory);
        });
    } else {
        categorySelect
            .append("option")
            .attr("value", "")
            .text("Sem categorias disponíveis");
        categorySelect
            .attr("disabled", true)
            .classed("disabled", true);
    }
    updateCountrySummary();
}
