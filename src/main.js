/**
 * Main Application Entry Point
 * The Price of Living - Information Visualization Project
 */

import { loadInflationByCategories, loadBulletGraphData, loadHICPData, loadIncomeAndInflationData } from './modules/data-loader.js';
import { createInflationCategoriesChart } from './modules/line-chart.js';
import { createRadarChart, setupYearSelection, updateRadarChart } from './modules/radar-chart.js';
import { setupBulletYearSelector } from './modules/bullet-graph.js';
import { createChoroplethMap, setupChoroplethControls } from './modules/choropleth-map.js';
import { renderCountrySelectorMap, refreshCountrySelectorMap } from './modules/country-selector-map.js';
import { createScatterPlot, setupScatterControls } from './modules/scatter-plot.js';
import { initSmoothScroll } from './modules/utils.js';

/**
 * Initialize visualizations when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded. Initializing visualizations...");
    console.log("D3.js version:", d3.version);

    // Initialize all visualizations
    initializeApp();
});

/**
 * Main application initialization
 */
async function initializeApp() {
    // Initialize with default country
    window.currentCountry = "Portugal";
    window.lastCountryChangeSource = "init";

    // Load and create inflation by categories visualization
    await loadAndDisplayInflationData(window.currentCountry);

    // Load and create bullet graph visualization
    await loadAndDisplayBulletGraph();

    // Load and create choropleth map visualization
    await loadAndDisplayChoroplethMap();

    // Load and create scatter plot visualization
    await loadAndDisplayScatterPlot();

    // Setup navigation and controls
    initSmoothScroll();
    setupVisualizationControls();
    setupCountrySelector();
    updateCountryCardState(window.currentCountry);
    await renderCountrySelectorMap();
    refreshCountrySelectorMap(window.currentCountry);
}

/**
 * Load and display inflation data for a specific country
 */
async function loadAndDisplayInflationData(country = "Portugal") {
    try {
        const data = await loadInflationByCategories(country);
        if (data) {
            createInflationCategoriesChart(data, country);
        } else {
            d3.select("#viz-inflation-categories")
                .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar dados</p></div>");
        }
    } catch (error) {
        console.error("Error in loadAndDisplayInflationData:", error);
    }
}

/**
 * Load and display bullet graph data
 */
async function loadAndDisplayBulletGraph(country = "Portugal") {
    try {
        const bulletData = await loadBulletGraphData(country);
        if (bulletData) {
            setupBulletYearSelector(bulletData, country);
        } else {
            d3.select("#viz-bullet-graph")
                .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar dados do salário</p></div>");
        }
    } catch (error) {
        console.error("Error in loadAndDisplayBulletGraph:", error);
    }
}

/**
 * Load and display choropleth map
 */
async function loadAndDisplayChoroplethMap(country = "Portugal") {
    try {
        const hicpData = await loadHICPData(country);
        if (hicpData) {
            setupChoroplethControls(hicpData, country);
            await createChoroplethMap(hicpData, country);
        } else {
            d3.select("#viz-choropleth-map")
                .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar dados HICP</p></div>");
        }
    } catch (error) {
        console.error("Error in loadAndDisplayChoroplethMap:", error);
        d3.select("#viz-choropleth-map")
            .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar mapa: " + error.message + "</p></div>");
    }
}

let isChangingCountry = false;

async function changeCountry(selectedCountry, options = {}) {
    const targetCountry = selectedCountry || "Portugal";

    if (isChangingCountry) {
        return;
    }

    if (!options.force && window.currentCountry === targetCountry) {
        updateCountryCardState(targetCountry);
        return;
    }

    isChangingCountry = true;

    window.lastCountryChangeSource = options.source || "unknown";

    console.debug("[changeCountry] triggered", {
        targetCountry,
        source: window.lastCountryChangeSource,
        previousCountry: window.currentCountry
    });

    window.currentCountry = targetCountry;
    updateCountryCardState(targetCountry);
    refreshCountrySelectorMap(targetCountry);

    try {
        await loadAndDisplayInflationData(targetCountry);
        await loadAndDisplayBulletGraph(targetCountry);
        await loadAndDisplayChoroplethMap(targetCountry);
        await loadAndDisplayScatterPlot(targetCountry);
    } finally {
        console.debug("[changeCountry] completed", {
            targetCountry,
            source: window.lastCountryChangeSource
        });
        isChangingCountry = false;
    }
}

function updateCountryCardState(selectedCountry) {
    const countryCards = d3.selectAll(".country-card");
    if (countryCards.empty()) {
        return;
    }

    countryCards.classed("active", function() {
        return d3.select(this).attr("data-country") === selectedCountry;
    });
}

/**
 * Load and display scatter plot
 */
async function loadAndDisplayScatterPlot(country = "Portugal") {
    try {
        const scatterData = await loadIncomeAndInflationData(country);
        if (scatterData) {
            setupScatterControls(scatterData, country);
        } else {
            d3.select("#viz-scatter-plot")
                .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar dados de rendimento e inflação</p></div>");
        }
    } catch (error) {
        console.error("Error in loadAndDisplayScatterPlot:", error);
        d3.select("#viz-scatter-plot")
            .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar scatter plot: " + error.message + "</p></div>");
    }
}

/**
 * Setup visualization controls (toggle buttons)
 */
function setupVisualizationControls() {
    const btnTimeline = d3.select("#btn-timeline-view");
    const btnRadar = d3.select("#btn-radar-view");
    const yearSelectionContainer = d3.select("#year-selection-container");
    const categoryFilterContainer = d3.select("#category-filter-container");

    let cachedData = {};

    // Load data once and cache it per country
    async function getCachedData(country) {
        if (!cachedData[country]) {
            cachedData[country] = await loadInflationByCategories(country);
        }
        return cachedData[country];
    }

    // Timeline view button
    btnTimeline.on("click", async function() {
        btnTimeline.classed("active", true);
        btnRadar.classed("active", false);
        yearSelectionContainer.style("display", "none");
        categoryFilterContainer.style("display", "block");

        const data = await getCachedData(window.currentCountry);
        if (data) {
            createInflationCategoriesChart(data, window.currentCountry);
        }
    });

    // Radar view button
    btnRadar.on("click", async function() {
        btnTimeline.classed("active", false);
        btnRadar.classed("active", true);
        yearSelectionContainer.style("display", "block");
        categoryFilterContainer.style("display", "none");

        const data = await getCachedData(window.currentCountry);
        if (data) {
            setupYearSelection(data, updateRadarChart, window.currentCountry);
        }
    });
}

/**
 * Setup country selector
 */
function setupCountrySelector() {
    const countryCards = d3.selectAll(".country-card");

    // Disabled: Only the map selector should trigger country changes
    // countryCards.on("click", async function() {
    //     const selectedCountry = d3.select(this).attr("data-country");
    //     await changeCountry(selectedCountry);
    // });
}

// Export functions for global access if needed
window.visualizations = {
    createInflationCategoriesChart,
    createRadarChart,
    setupBulletYearSelector,
    createChoroplethMap,
    createScatterPlot
};

window.changeCountry = changeCountry;
