import { countryNameMap } from './country-name-map.js';

let svg = null;
let path = null;
let selectorGroup = null;
let tooltip = null;
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

async function loadEuropeGeoJSON() {
    const url = 'https://unpkg.com/world-atlas@2/countries-50m.json';
    const topology = await d3.json(url);
    const countries = topojson.feature(topology, topology.objects.countries);
    countries.features = countries.features.filter(d => {
        const centroid = d3.geoCentroid(d);
        const lon = centroid[0];
        const lat = centroid[1];
        return lon >= -25 && lon <= 45 && lat >= 35 && lat <= 72;
    });
    return countries;
}

export async function renderCountrySelectorMap() {
    const container = d3.select('#country-selector-map');
    if (container.empty()) {
        return;
    }
    container.selectAll('*').remove();

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

    d3.selectAll('.selector-tooltip').remove();
    tooltip = d3.select('body').append('div')
        .attr('class', 'map-tooltip selector-tooltip')
        .style('opacity', 0);

    const projection = d3.geoMercator()
        .center([15, 54])
        .scale(svgWidth * 0.62)
        .translate([svgWidth / 2, svgHeight / 2]);

    path = d3.geoPath().projection(projection);

    selectorGroup = svg.append('g');

    const geoData = await loadEuropeGeoJSON();

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
        .on('mouseover', (event, d) => {
            const target = d3.select(event.currentTarget);
            target.transition().duration(200)
                .attr('fill', hoverCountryFill)
                .attr('stroke-width', 2)
                .attr('opacity', 0.95);

            tooltip.transition().duration(200).style('opacity', 1);
            tooltip.html(`<strong>${getFeatureCountryName(d) || 'País'}</strong>`);

            const tooltipNode = tooltip.node();
            const tooltipWidth = tooltipNode.offsetWidth;
            const tooltipHeight = tooltipNode.offsetHeight;
            const windowWidth = window.innerWidth;

            let left = event.clientX + 15;
            let top = event.clientY - tooltipHeight - 12;

            if (left + tooltipWidth > windowWidth - 16) {
                left = event.clientX - tooltipWidth - 15;
            }
            if (top < 12) {
                top = event.clientY + 15;
            }

            tooltip.style('left', left + 'px')
                .style('top', top + 'px');
        })
        .on('mousemove', (event) => {
            const tooltipNode = tooltip.node();
            const tooltipWidth = tooltipNode.offsetWidth;
            const tooltipHeight = tooltipNode.offsetHeight;
            const windowWidth = window.innerWidth;

            let left = event.clientX + 15;
            let top = event.clientY - tooltipHeight - 12;

            if (left + tooltipWidth > windowWidth - 16) {
                left = event.clientX - tooltipWidth - 15;
            }
            if (top < 12) {
                top = event.clientY + 15;
            }

            tooltip.style('left', left + 'px')
                .style('top', top + 'px');
        })
        .on('mouseout', () => {
            tooltip.transition().duration(250).style('opacity', 0);
            applyCountryFills(window.currentCountry);
        })
        .on('click', (_, d) => handleCountryClick(d));

    applyCountryFills(window.currentCountry);
}

export function refreshCountrySelectorMap(selectedCountry = window.currentCountry) {
    applyCountryFills(selectedCountry);
}
