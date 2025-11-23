/**
 * Main Application Entry Point
 * The Price of Living - Information Visualization Project
 */

import { loadInflationByCategories, loadBulletGraphData, loadHICPData, loadIncomeAndInflationData } from './modules/data-loader.js';
import { createInflationCategoriesChart, resetInflationCategoriesState } from './modules/line-chart.js';
import { createRadarChart, setupYearSelection, updateRadarChart } from './modules/radar-chart.js';
import { setupBulletYearSelector, resetBulletYearSelector } from './modules/bullet-graph.js';
import { createChoroplethMap, setupChoroplethControls } from './modules/choropleth-map.js';
import { renderCountrySelectorMap, refreshCountrySelectorMap } from './modules/country-selector-map.js';
import { createScatterPlot, setupScatterControls, resetScatterControls } from './modules/scatter-plot.js';
import { initSmoothScroll } from './modules/utils.js';
import { renderEmptyState, startEmptyStateObserver } from './modules/empty-state.js';

/**
 * Initialize visualizations when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded. Initializing visualizations...");
    console.log("D3.js version:", d3.version);

    // Initialize all visualizations
    startEmptyStateObserver();
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
            d3.select("#year-selection-container").style("display", "none");
        } else {
            resetInflationCategoriesState();
            d3.select("#category-filter-container").html("");
            d3.select("#year-checkboxes").html("");
            d3.select("#year-selection-container").style("display", "none");
            d3.select("#viz-inflation-categories")
                .html(renderEmptyState({
                    title: "Sem dados de inflação",
                    message: "Não conseguimos carregar os indicadores de inflação por categoria para o país selecionado.",
                    meta: "Tente escolher outro país ou atualizar a página.",
                    icon: "📉"
                }));
        }
    } catch (error) {
        console.error("Error in loadAndDisplayInflationData:", error);
        resetInflationCategoriesState();
        d3.select("#category-filter-container").html("");
        d3.select("#year-checkboxes").html("");
        d3.select("#year-selection-container").style("display", "none");
        d3.select("#viz-inflation-categories")
            .html(renderEmptyState({
                title: "Erro ao apresentar a inflação",
                message: "Ocorreu um problema ao preparar esta visualização.",
                meta: `Detalhes técnicos: ${error.message}`,
                icon: "⚠️"
            }));
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
            resetBulletYearSelector();
            d3.select("#viz-bullet-graph")
                .html(renderEmptyState({
                    title: "Sem dados de salário mínimo",
                    message: "Não encontrámos informação suficiente para comparar o salário mínimo deste país.",
                    meta: "Selecione outro país ou ano para continuar.",
                    icon: "💶"
                }));
        }
    } catch (error) {
        console.error("Error in loadAndDisplayBulletGraph:", error);
        resetBulletYearSelector('Erro ao carregar anos');
        d3.select("#viz-bullet-graph")
            .html(renderEmptyState({
                title: "Erro ao carregar a visualização",
                message: "Algo correu mal ao preparar o gráfico de salário mínimo.",
                meta: `Detalhes técnicos: ${error.message}`,
                icon: "⚠️"
            }));
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
                .html(renderEmptyState({
                    title: "Sem dados HICP",
                    message: "Não conseguimos obter o índice harmonizado de preços no consumidor para esta seleção.",
                    meta: "Experimente atualizar ou escolher outro país para continuar.",
                    icon: "🗺️"
                }));
        }
    } catch (error) {
        console.error("Error in loadAndDisplayChoroplethMap:", error);
        d3.select("#viz-choropleth-map")
            .html(renderEmptyState({
                title: "Erro ao carregar o mapa",
                message: "Ocorreu um problema ao renderizar o mapa temático da Europa.",
                meta: `Detalhes técnicos: ${error.message}`,
                icon: "⚠️"
            }));
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
            resetScatterControls();
            d3.select("#viz-scatter-plot")
                .html(renderEmptyState({
                    title: "Dados insuficientes",
                    message: "Não há registos suficientes para cruzar rendimento e inflação neste período.",
                    meta: "Selecione outro país ou intervalo temporal.",
                    icon: "📊"
                }));
        }
    } catch (error) {
        console.error("Error in loadAndDisplayScatterPlot:", error);
        resetScatterControls();
        d3.select("#viz-scatter-plot")
            .html(renderEmptyState({
                title: "Erro ao carregar o scatter plot",
                message: "Ocorreu um problema ao preparar esta visualização comparativa.",
                meta: `Detalhes técnicos: ${error.message}`,
                icon: "⚠️"
            }));
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

        const data = await getCachedData(window.currentCountry);
        if (data) {
            categoryFilterContainer.style("display", "block");
            createInflationCategoriesChart(data, window.currentCountry);
        } else {
            categoryFilterContainer.style("display", "none");
        }
    });

    // Radar view button
    btnRadar.on("click", async function() {
        btnTimeline.classed("active", false);
        btnRadar.classed("active", true);
        categoryFilterContainer.style("display", "none");

        const data = await getCachedData(window.currentCountry);
        if (data && data.categories?.length) {
            yearSelectionContainer.style("display", "block");
            setupYearSelection(data, updateRadarChart, window.currentCountry);
        } else {
            yearSelectionContainer.style("display", "none");
        }
    });
}

/**
 * Setup country selector
 */
function setupCountrySelector() {
    const countryCards = d3.selectAll(".country-card");

    countryCards.on("click", async function() {
        const selectedCountry = d3.select(this).attr("data-country");
        await changeCountry(selectedCountry);
    });
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
