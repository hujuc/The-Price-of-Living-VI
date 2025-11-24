import { countryNameMap } from './country-name-map.js';
import { renderEmptyState } from './empty-state.js';

let svg = null;
let path = null;
let selectorGroup = null;
let tooltip = null;
let loadedCountries = [];
const baseCountryFill = '#dbeafe';
const selectedCountryFill = '#2563eb';
const hoverCountryFill = '#60a5fa';
const strokeColor = '#ffffff';
const strokeWidth = 1.5;
const selectedStrokeWidth = 3.5;
const bgGradientColor1 = '#fefefe';
const bgGradientColor2 = '#f0f9ff';

function resolveToPortuguese(name) {
    if (!name) {
        return null;
    }
    if (countryNameMap[name] !== undefined) {
        return name;
    }
    for (const [portuguese, english] of Object.entries(countryNameMap)) {
        if (english === name) {
            return portuguese;
        }
    }
    return name;
}

function getFeatureCountryName(feature) {
    return feature?.properties?.name;
}

function ensureTooltip() {
    if (!tooltip || tooltip.empty() || !document.body.contains(tooltip.node())) {
        tooltip = d3.select('body').append('div')
            .attr('class', 'map-tooltip selector-tooltip')
            .style('opacity', 0)
            .style('pointer-events', 'none');
    }
    return tooltip;
}

function getDisplayName(feature) {
    const englishName = getFeatureCountryName(feature);
    if (!englishName) {
        return 'País';
    }
    return resolveToPortuguese(englishName) || englishName;
}

function positionTooltip(event, tooltipSelection) {
    const tooltipNode = tooltipSelection.node();
    if (!tooltipNode) {
        return;
    }

    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = event.clientX + 15;
    let top = event.clientY - tooltipHeight - 12;

    if (left + tooltipWidth > windowWidth - 16) {
        left = event.clientX - tooltipWidth - 15;
    }
    if (left < 12) {
        left = 12;
    }
    if (top < 12) {
        top = event.clientY + 15;
    }
    if (top + tooltipHeight > windowHeight - 12) {
        top = windowHeight - tooltipHeight - 12;
    }

    tooltipSelection.style('left', `${left}px`)
        .style('top', `${top}px`);
}

function matchesSelection(feature, selectedCountry) {
    if (!selectedCountry) {
        return false;
    }
    const portugueseSelection = resolveToPortuguese(selectedCountry) || selectedCountry;
    const englishName = countryNameMap[portugueseSelection] || portugueseSelection;
    return getFeatureCountryName(feature) === englishName;
}

function applyCountryFills(selectedCountry) {
    if (!svg || !selectorGroup) {
        return;
    }
    selectorGroup.selectAll('path')
        .transition()
        .duration(300)
        .attr('fill', d => matchesSelection(d, selectedCountry) ? selectedCountryFill : baseCountryFill)
        .attr('stroke', strokeColor)
        .attr('stroke-width', d => matchesSelection(d, selectedCountry) ? selectedStrokeWidth : strokeWidth)
        .attr('opacity', 1);
}

function handleCountryClick(feature) {
    const portugueseName = resolveToPortuguese(feature.properties.name);
    if (!portugueseName) {
        return;
    }
    if (typeof window !== 'undefined' && typeof window.changeCountry === 'function') {
        window.changeCountry(portugueseName, { source: 'map-selector', force: true });
    }
}

async function fetchTopology(url, label) {
    const topology = await d3.json(url);
    if (!topology?.objects?.countries) {
        throw new Error(`${label}: resposta inválida do ficheiro de geometria.`);
    }
    return topology;
}

async function loadEuropeGeoJSON() {
    if (typeof d3 === 'undefined') {
        throw new Error('Biblioteca d3 não foi carregada.');
    }
    if (typeof topojson === 'undefined') {
        throw new Error('Biblioteca topojson não está disponível.');
    }

    try {
        let topology;
        try {
            topology = await fetchTopology('data/europe-topology.json', 'Ficheiro local');
        } catch (localError) {
            console.warn('TopoJSON local indisponível, a recorrer ao CDN...', localError);
            topology = await fetchTopology('https://unpkg.com/world-atlas@2/countries-50m.json', 'CDN world-atlas');
        }

        const countries = topojson.feature(topology, topology.objects.countries);
        countries.features = countries.features.filter(d => {
            const centroid = d3.geoCentroid(d);
            const lon = centroid[0];
            const lat = centroid[1];
            return lon >= -25 && lon <= 45 && lat >= 35 && lat <= 72;
        });
        if (!countries.features.length) {
            throw new Error('Nenhum país europeu foi carregado do dataset.');
        }
        return countries;
    } catch (error) {
        throw new Error(`Falha ao descarregar o mapa da Europa: ${error.message}`);
    }
}

export async function renderCountrySelectorMap() {
    const container = d3.select('#country-selector-map');
    if (container.empty()) {
        return;
    }
    container.selectAll('*').remove();

    try {
        const availableWidth = Math.min(container.node().getBoundingClientRect().width, 900);
        const svgWidth = Math.max(availableWidth, 480);
        const svgHeight = Math.round(svgWidth * 0.68);

        svg = container.append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Add a subtle background gradient
        const defs = svg.append('defs');
        const bgGradient = defs.append('linearGradient')
            .attr('id', 'mapBgGradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '100%');
        bgGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', bgGradientColor1)
            .attr('stop-opacity', 1);
        bgGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', bgGradientColor2)
            .attr('stop-opacity', 1);

        svg.append('rect')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('fill', 'url(#mapBgGradient)');

        ensureTooltip();

        const projection = d3.geoMercator()
            .center([15, 54])
            .scale(svgWidth * 0.62)
            .translate([svgWidth / 2, svgHeight / 2]);

        path = d3.geoPath().projection(projection);

        selectorGroup = svg.append('g');

        const geoData = await loadEuropeGeoJSON();

        // Store loaded countries for search
        loadedCountries = geoData.features
            .map(f => resolveToPortuguese(getFeatureCountryName(f)))
            .filter(name => name && countryNameMap[name])
            .sort();

        selectorGroup.selectAll('path')
            .data(geoData.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'selector-country')
            .attr('fill', baseCountryFill)
            .attr('stroke', strokeColor)
            .attr('stroke-width', strokeWidth)
            .style('cursor', 'pointer')
            .on('pointerenter', (event, d) => {
                const target = d3.select(event.currentTarget);
                target.transition().duration(200)
                    .attr('fill', hoverCountryFill)
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.95);

                const tooltipSelection = ensureTooltip();
                tooltipSelection.interrupt().style('opacity', 1);
                tooltipSelection.html(`<strong>${getDisplayName(d)}</strong>`);
                positionTooltip(event, tooltipSelection);
            })
            .on('pointermove', (event) => {
                const tooltipSelection = ensureTooltip();
                positionTooltip(event, tooltipSelection);
            })
            .on('pointerleave', () => {
                const tooltipSelection = ensureTooltip();
                tooltipSelection.interrupt().style('opacity', 0);
                applyCountryFills(window.currentCountry);
            })
            .on('click', (_, d) => handleCountryClick(d));

        applyCountryFills(window.currentCountry);
    } catch (error) {
        console.error('Erro ao criar o mapa de seleção de países:', error);
        container.html(renderEmptyState({
            title: 'Não foi possível carregar o mapa europeu',
            message: 'Este mapa depende de um ficheiro externo com as fronteiras da Europa. Quando a ligação à Internet falha ou o fornecedor está indisponível, o mapa não consegue ser desenhado.',
            meta: `Detalhes técnicos: ${error.message}`,
            icon: '🗺️'
        }));
    }
}

export function refreshCountrySelectorMap(selectedCountry = window.currentCountry) {
    applyCountryFills(selectedCountry);
}

/**
 * Setup country search functionality
 */
export function setupCountrySearch() {
    const searchInput = d3.select('#country-search-input');
    const clearBtn = d3.select('#clear-search');
    const resultsContainer = d3.select('#search-results');

    if (searchInput.empty()) {
        return;
    }

    // Use only countries that are actually loaded in the map
    function getAvailableCountries() {
        return loadedCountries.length > 0 ? loadedCountries : Object.keys(countryNameMap).sort();
    }

    let selectedIndex = -1;

    /**
     * Internal search function with fuzzy matching and accent-insensitive comparison
     * Filters available countries based on user query, supporting partial matches and word-start matching.
     * Displays matching results in a dropdown, handles empty states, and manages keyboard navigation state.
     * Total: 58 lines including normalization, filtering logic, DOM rendering, and event binding.
     *
     * @param {string} query - The search query string entered by the user
     */
    function performSearch(query) {
        if (!query || query.trim() === '') {
            resultsContainer.style('display', 'none');
            clearBtn.style('display', 'none');
            selectedIndex = -1;
            return;
        }

        clearBtn.style('display', 'block');

        const normalizedQuery = query.toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos

        const availableCountries = getAvailableCountries();
        const matches = availableCountries.filter(country => {
            const normalizedCountry = country.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            // Verifica se contém a query completa
            if (normalizedCountry.includes(normalizedQuery)) {
                return true;
            }

            // Verifica se alguma palavra do país começa com a query
            const words = normalizedCountry.split(/\s+/);
            return words.some(word => word.startsWith(normalizedQuery));
        });

        if (matches.length === 0) {
            resultsContainer
                .style('display', 'block')
                .html('<div class="search-no-results">Nenhum país encontrado</div>');
            selectedIndex = -1;
            return;
        }

        resultsContainer
            .style('display', 'block')
            .html('');

        matches.forEach((country, index) => {
            resultsContainer.append('div')
                .attr('class', 'search-result-item')
                .attr('data-index', index)
                .attr('data-country', country)
                .text(country)
                .on('click', () => selectCountry(country))
                .on('mouseenter', function() {
                    resultsContainer.selectAll('.search-result-item')
                        .classed('highlighted', false);
                    d3.select(this).classed('highlighted', true);
                    selectedIndex = index;
                });
        });

        selectedIndex = -1;
    }

    // Select country function
    function selectCountry(country) {
        if (typeof window !== 'undefined' && typeof window.changeCountry === 'function') {
            window.changeCountry(country, { source: 'search', force: true });
        }
        searchInput.node().value = '';
        resultsContainer.style('display', 'none');
        clearBtn.style('display', 'none');
        selectedIndex = -1;
        searchInput.node().blur();
    }

    // Clear search
    function clearSearch() {
        searchInput.node().value = '';
        resultsContainer.style('display', 'none');
        clearBtn.style('display', 'none');
        selectedIndex = -1;
        searchInput.node().focus();
    }

    // Event listeners
    searchInput.on('input', function() {
        performSearch(this.value);
    });

    searchInput.on('keydown', function(event) {
        const items = resultsContainer.selectAll('.search-result-item').nodes();

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (items.length > 0) {
                selectedIndex = (selectedIndex + 1) % items.length;
                updateHighlight();
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (items.length > 0) {
                selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
                updateHighlight();
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                const country = d3.select(items[selectedIndex]).attr('data-country');
                selectCountry(country);
            }
        } else if (event.key === 'Escape') {
            clearSearch();
        }
    });

    function updateHighlight() {
        const items = resultsContainer.selectAll('.search-result-item');
        items.classed('highlighted', false);

        if (selectedIndex >= 0) {
            const selectedItem = items.filter((_, i) => i === selectedIndex);
            selectedItem.classed('highlighted', true);

            // Scroll into view if needed
            const node = selectedItem.node();
            if (node) {
                node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    clearBtn.on('click', clearSearch);

    // Close results when clicking outside
    d3.select('body').on('click', function(event) {
        const target = event.target;
        const searchContainer = document.querySelector('.country-search-container');

        if (searchContainer && !searchContainer.contains(target)) {
            resultsContainer.style('display', 'none');
            selectedIndex = -1;
        }
    });
}
