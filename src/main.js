/**
 * Main Application Entry Point
 * The Price of Living - Information Visualization Project
 */

import { loadInflationByCategories } from './modules/data-loader.js';
import { createInflationCategoriesChart } from './modules/line-chart.js';
import { createRadarChart, setupYearSelection, updateRadarChart } from './modules/radar-chart.js';
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
    // Load and create inflation by categories visualization
    await loadAndDisplayInflationData();

    // Setup navigation and controls
    initSmoothScroll();
    setupVisualizationControls();
}

/**
 * Load and display inflation data (line chart by default)
 */
async function loadAndDisplayInflationData() {
    try {
        const data = await loadInflationByCategories();
        if (data) {
            createInflationCategoriesChart(data);
        } else {
            d3.select("#viz-inflation-categories")
                .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar dados</p></div>");
        }
    } catch (error) {
        console.error("Error in loadAndDisplayInflationData:", error);
    }
}

/**
 * Setup visualization controls (toggle buttons)
 */
function setupVisualizationControls() {
    const btnTimeline = d3.select("#btn-timeline-view");
    const btnRadar = d3.select("#btn-radar-view");
    const yearSelectionContainer = d3.select("#year-selection-container");

    let cachedData = null;

    // Load data once and cache it
    async function getCachedData() {
        if (!cachedData) {
            cachedData = await loadInflationByCategories();
        }
        return cachedData;
    }

    // Timeline view button
    btnTimeline.on("click", async function() {
        btnTimeline.classed("active", true);
        btnRadar.classed("active", false);
        yearSelectionContainer.style("display", "none");

        const data = await getCachedData();
        if (data) {
            createInflationCategoriesChart(data);
        }
    });

    // Radar view button
    btnRadar.on("click", async function() {
        btnTimeline.classed("active", false);
        btnRadar.classed("active", true);
        yearSelectionContainer.style("display", "block");

        const data = await getCachedData();
        if (data) {
            setupYearSelection(data, updateRadarChart);
        }
    });
}

// Export functions for global access if needed
window.visualizations = {
    createInflationCategoriesChart,
    createRadarChart
};
