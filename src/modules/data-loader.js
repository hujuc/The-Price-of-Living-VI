/**
 * Data Loader Module
 * Handles loading and processing of CSV data
 */

// Centralized country name mapping to handle datasets with different naming conventions
const countryMappings = {
    "Albânia": { pordata: "Albânia", eurostat: "Albania", display: "Albânia" },
    "Albania": { pordata: "Albânia", eurostat: "Albania", display: "Albânia" },
    "Alemanha": { pordata: "Alemanha", eurostat: "Germany", display: "Alemanha" },
    "Germany": { pordata: "Alemanha", eurostat: "Germany", display: "Alemanha" },
    "Áustria": { pordata: "Áustria", eurostat: "Austria", display: "Áustria" },
    "Austria": { pordata: "Áustria", eurostat: "Austria", display: "Áustria" },
    "Bélgica": { pordata: "Bélgica", eurostat: "Belgium", display: "Bélgica" },
    "Belgium": { pordata: "Bélgica", eurostat: "Belgium", display: "Bélgica" },
    "Bulgária": { pordata: "Bulgária", eurostat: "Bulgaria", display: "Bulgária" },
    "Bulgaria": { pordata: "Bulgária", eurostat: "Bulgaria", display: "Bulgária" },
    "Chipre": { pordata: "Chipre", eurostat: "Cyprus", display: "Chipre" },
    "Cyprus": { pordata: "Chipre", eurostat: "Cyprus", display: "Chipre" },
    "Croácia": { pordata: "Croácia", eurostat: "Croatia", display: "Croácia" },
    "Croatia": { pordata: "Croácia", eurostat: "Croatia", display: "Croácia" },
    "República Checa": { pordata: "República Checa", eurostat: "Czechia", display: "República Checa" },
    "Czechia": { pordata: "República Checa", eurostat: "Czechia", display: "República Checa" },
    "Dinamarca": { pordata: "Dinamarca", eurostat: "Denmark", display: "Dinamarca" },
    "Denmark": { pordata: "Dinamarca", eurostat: "Denmark", display: "Dinamarca" },
    "Eslováquia": { pordata: "Eslováquia", eurostat: "Slovakia", display: "Eslováquia" },
    "Slovakia": { pordata: "Eslováquia", eurostat: "Slovakia", display: "Eslováquia" },
    "Eslovénia": { pordata: "Eslovénia", eurostat: "Slovenia", display: "Eslovénia" },
    "Slovenia": { pordata: "Eslovénia", eurostat: "Slovenia", display: "Eslovénia" },
    "Espanha": { pordata: "Espanha", eurostat: "Spain", display: "Espanha" },
    "Spain": { pordata: "Espanha", eurostat: "Spain", display: "Espanha" },
    "Estados Unidos": { pordata: "Estados Unidos", eurostat: "United States", display: "Estados Unidos" },
    "United States": { pordata: "Estados Unidos", eurostat: "United States", display: "Estados Unidos" },
    "Estónia": { pordata: "Estónia", eurostat: "Estonia", display: "Estónia" },
    "Estonia": { pordata: "Estónia", eurostat: "Estonia", display: "Estónia" },
    "Finlândia": { pordata: "Finlândia", eurostat: "Finland", display: "Finlândia" },
    "Finland": { pordata: "Finlândia", eurostat: "Finland", display: "Finlândia" },
    "França": { pordata: "França", eurostat: "France", display: "França" },
    "France": { pordata: "França", eurostat: "France", display: "França" },
    "Grécia": { pordata: "Grécia", eurostat: "Greece", display: "Grécia" },
    "Greece": { pordata: "Grécia", eurostat: "Greece", display: "Grécia" },
    "Hungria": { pordata: "Hungria", eurostat: "Hungary", display: "Hungria" },
    "Hungary": { pordata: "Hungria", eurostat: "Hungary", display: "Hungria" },
    "Islândia": { pordata: "Islândia", eurostat: "Iceland", display: "Islândia" },
    "Iceland": { pordata: "Islândia", eurostat: "Iceland", display: "Islândia" },
    "Irlanda": { pordata: "Irlanda", eurostat: "Ireland", display: "Irlanda" },
    "Ireland": { pordata: "Irlanda", eurostat: "Ireland", display: "Irlanda" },
    "Itália": { pordata: "Itália", eurostat: "Italy", display: "Itália" },
    "Italy": { pordata: "Itália", eurostat: "Italy", display: "Itália" },
    "Letónia": { pordata: "Letónia", eurostat: "Latvia", display: "Letónia" },
    "Latvia": { pordata: "Letónia", eurostat: "Latvia", display: "Letónia" },
    "Lituânia": { pordata: "Lituânia", eurostat: "Lithuania", display: "Lituânia" },
    "Lithuania": { pordata: "Lituânia", eurostat: "Lithuania", display: "Lituânia" },
    "Luxemburgo": { pordata: "Luxemburgo", eurostat: "Luxembourg", display: "Luxemburgo" },
    "Luxembourg": { pordata: "Luxemburgo", eurostat: "Luxembourg", display: "Luxemburgo" },
    "Macedónia do Norte": { pordata: "Macedónia do Norte", eurostat: "North Macedonia", display: "Macedónia do Norte" },
    "North Macedonia": { pordata: "Macedónia do Norte", eurostat: "North Macedonia", display: "Macedónia do Norte" },
    "Malta": { pordata: "Malta", eurostat: "Malta", display: "Malta" },
    "Moldávia": { pordata: "Moldávia", eurostat: "Moldova", display: "Moldávia" },
    "Moldova": { pordata: "Moldávia", eurostat: "Moldova", display: "Moldávia" },
    "Montenegro": { pordata: "Montenegro", eurostat: "Montenegro", display: "Montenegro" },
    "Noruega": { pordata: "Noruega", eurostat: "Norway", display: "Noruega" },
    "Norway": { pordata: "Noruega", eurostat: "Norway", display: "Noruega" },
    "Países Baixos": { pordata: "Países Baixos", eurostat: "Netherlands", display: "Países Baixos" },
    "Netherlands": { pordata: "Países Baixos", eurostat: "Netherlands", display: "Países Baixos" },
    "Polónia": { pordata: "Polónia", eurostat: "Poland", display: "Polónia" },
    "Poland": { pordata: "Polónia", eurostat: "Poland", display: "Polónia" },
    "Portugal": { pordata: "Portugal", eurostat: "Portugal", display: "Portugal" },
    "Reino Unido": { pordata: "Reino Unido", eurostat: "United Kingdom", display: "Reino Unido" },
    "United Kingdom": { pordata: "Reino Unido", eurostat: "United Kingdom", display: "Reino Unido" },
    "Roménia": { pordata: "Roménia", eurostat: "Romania", display: "Roménia" },
    "Romania": { pordata: "Roménia", eurostat: "Romania", display: "Roménia" },
    "Sérvia": { pordata: "Sérvia", eurostat: "Serbia", display: "Sérvia" },
    "Serbia": { pordata: "Sérvia", eurostat: "Serbia", display: "Sérvia" },
    "Síria": { pordata: "Síria", eurostat: "Syria", display: "Síria" },
    "Syria": { pordata: "Síria", eurostat: "Syria", display: "Síria" },
    "Suécia": { pordata: "Suécia", eurostat: "Sweden", display: "Suécia" },
    "Sweden": { pordata: "Suécia", eurostat: "Sweden", display: "Suécia" },
    "Suíça": { pordata: "Suíça", eurostat: "Switzerland", display: "Suíça" },
    "Switzerland": { pordata: "Suíça", eurostat: "Switzerland", display: "Suíça" },
    "Turquia": { pordata: "Turquia", eurostat: "Turkey", display: "Turquia" },
    "Turkey": { pordata: "Turquia", eurostat: "Turkey", display: "Turquia" },
    "Türkiye": { pordata: "Turquia", eurostat: "Türkiye", display: "Turquia" },
    "Ucrânia": { pordata: "Ucrânia", eurostat: "Ukraine", display: "Ucrânia" },
    "Ukraine": { pordata: "Ucrânia", eurostat: "Ukraine", display: "Ucrânia" }
};

function getPordataCountryName(country) {
    if (!country) {
        return null;
    }
    return countryMappings[country]?.pordata || country;
}

function getEurostatCountryName(country) {
    if (!country) {
        return null;
    }
    return countryMappings[country]?.eurostat || country;
}

function getDisplayCountryName(country) {
    if (!country) {
        return null;
    }
    return countryMappings[country]?.display || country;
}

const comparisonSnapshotCache = {};

/**
 * Load CSV data from file
 */
export async function loadCSVData(filepath) {
    try {
        const data = await d3.csv(filepath);
        console.log(`Data loaded from ${filepath}:`, data.length, "rows");
        return data;
    } catch (error) {
        console.error("Error loading data:", error);
        return null;
    }
}

/**
 * Process inflation data from CSV
 * Groups data by category and year
 * Optionally filters by country for multi-country datasets
 */
export function processInflationData(data, country = null) {
    const normalizedCountry = getPordataCountryName(country);

    const categories = new Set();
    const years = new Set();

    data.forEach(d => {
        const countryColumn = d["02. Nome País (Europa)"] || d["02. Nome Região (Portugal)"];
        if (normalizedCountry && countryColumn && countryColumn !== normalizedCountry) {
            return;
        }

        const year = +d["01. Ano"];
        const category = d["03. Filtro 1"];
        const value = parseFloat(d["08. Valor"]);

        if (!isNaN(year) && category && !isNaN(value)) {
            categories.add(category);
            years.add(year);
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const sortedCategories = Array.from(categories).sort();

    const categoriesData = {};

    sortedCategories.forEach(categoryName => {
        categoriesData[categoryName] = {
            name: categoryName,
            values: []
        };
    });

    data.forEach(d => {
        const countryColumn = d["02. Nome País (Europa)"] || d["02. Nome Região (Portugal)"];
        if (normalizedCountry && countryColumn && countryColumn !== normalizedCountry) {
            return;
        }

        const year = +d["01. Ano"];
        const category = d["03. Filtro 1"];
        const value = parseFloat(d["08. Valor"]);

        if (!isNaN(year) && category && !isNaN(value) && categoriesData[category]) {
            categoriesData[category].values.push({
                year,
                value
            });
        }
    });

    Object.values(categoriesData).forEach(cat => {
        cat.values.sort((a, b) => a.year - b.year);
    });

    return {
        categories: Object.values(categoriesData),
        years: sortedYears
    };
}

/**
 * Load and process inflation by categories data
 * Supports both single-country and multi-country datasets
 */
export async function loadInflationByCategories(country = "Portugal") {
    try {
        // Use the multi-country dataset
        const data = await loadCSVData("data/inflacao_portugal_europa.csv");
        if (!data) {
            throw new Error("Failed to load data");
        }

        const processedData = processInflationData(data, country);

        const hasCategories = processedData?.categories?.length;
        if (!hasCategories) {
            console.warn(`No inflation categories available for ${country}`);
            return null;
        }

        console.log(`Processed data for ${country}:`, processedData);
        return processedData;

    } catch (error) {
        console.error("Error loading inflation categories data:", error);
        return null;
    }
}

/**
 * Get list of available countries in the dataset
 */
export async function getAvailableCountries() {
    try {
        const data = await loadCSVData("data/inflacao_portugal_europa.csv");
        if (!data) {
            return [];
        }

        const countries = new Set();
        data.forEach(d => {
            const country = d["02. Nome País (Europa)"];
            if (country) {
                countries.add(country);
            }
        });

        return Array.from(countries).sort();
    } catch (error) {
        console.error("Error getting available countries:", error);
        return [];
    }
}

/**
 * Load and process minimum wage data for a specific country
 */
export async function loadMinimumWageData(country = "Portugal") {
    try {
        const targetCountry = getPordataCountryName(country);

        if (targetCountry === "Portugal") {
            const nationalData = await loadCSVData("data/salario-minimo-nacional.csv");
            if (!nationalData) {
                throw new Error("Failed to load Portugal wage data");
            }

            const wageData = {};

            nationalData.forEach(row => {
                const indicator = row["03. Indicador"];
                if (!indicator || !indicator.includes("Portugal continental")) {
                    return;
                }

                const year = parseInt(row["01. Ano"]);
                const valueStr = row["09. Valor"];
                if (!year || !valueStr || valueStr === 'x' || valueStr === '-' || valueStr === '-,') {
                    return;
                }

                const value = parseFloat(valueStr.replace(',', '.'));
                if (isNaN(value)) {
                    return;
                }

                wageData[year] = value;
            });

            console.log(`Minimum wage data loaded (Portugal):`, Object.keys(wageData).length, "years");
            return wageData;
        }

        // Use the Europe-wide minimum wage dataset for other countries
        const eurostatData = await loadCSVData("data/salario_minimo_europa.csv");
        if (!eurostatData) {
            throw new Error("Failed to load Eurostat wage data");
        }

        const wageData = {};
        const eurostatCountry = getEurostatCountryName(country);

        eurostatData.forEach(d => {
            const geo = d["geo"];
            const timePeriod = d["TIME_PERIOD"];
            const obsValue = d["OBS_VALUE"];

            if (geo === eurostatCountry && timePeriod && obsValue) {
                const year = parseInt(timePeriod.split("-")[0]);
                const value = parseFloat(obsValue);

                if (!isNaN(year) && !isNaN(value)) {
                    if (!wageData[year] || wageData[year] < value) {
                        wageData[year] = value;
                    }
                }
            }
        });

        console.log(`Minimum wage data loaded (${country}):`, Object.keys(wageData).length, "years");
        return wageData;

    } catch (error) {
        console.error("Error loading minimum wage data:", error);
        return null;
    }
}

/**
 * Calculate real wage adjusted for inflation
 * Base year is 2012
 */
export function calculateRealWage(nominalWage, inflationData, year, baseYear = 2012) {
    if (!inflationData || !inflationData.categories?.length) {
        return null;
    }

    // Find Total inflation category
    const totalInflation = inflationData.categories.find(c => c.name === "Total");
    if (!totalInflation) {
        return null;
    }

    // Calculate cumulative inflation from base year to target year
    let cumulativeInflation = 1.0;

    if (year > baseYear) {
        // Adjust forward (deflate)
        for (let y = baseYear + 1; y <= year; y++) {
            const inflationRate = totalInflation.values.find(v => v.year === y);
            if (inflationRate) {
                cumulativeInflation *= (1 + inflationRate.value / 100);
            }
        }
        return nominalWage / cumulativeInflation;
    } else if (year < baseYear) {
        // Adjust backward (inflate)
        for (let y = year + 1; y <= baseYear; y++) {
            const inflationRate = totalInflation.values.find(v => v.year === y);
            if (inflationRate) {
                cumulativeInflation *= (1 + inflationRate.value / 100);
            }
        }
        return nominalWage * cumulativeInflation;
    }

    return nominalWage; // Same as base year
}

/**
 * Prepare data for bullet graph comparison
 */
export async function loadBulletGraphData(country = "Portugal") {
    try {
        const [wageData, inflationData] = await Promise.all([
            loadMinimumWageData(country),
            loadInflationByCategories(country)
        ]);

        if (!wageData || !inflationData) {
            console.warn(`Bullet graph skipped: missing datasets for ${country}`);
            return null;
        }

        // Get years where we have both wage and inflation data
        const availableYears = Object.keys(wageData)
            .map(y => +y)
            .filter(year => year >= 1974) // Start from when we have wage data
            .sort((a, b) => a - b);

        if (availableYears.length === 0) {
            console.warn(`No wage data available for ${country}`);
            return null;
        }

        const baseYear = availableYears.includes(2012) ? 2012 : availableYears[0];
        const baseNominal = wageData[baseYear];

        if (!baseNominal) {
            console.warn(`Base year nominal wage missing for ${country} (year ${baseYear})`);
        }

        const bulletData = {};

        availableYears.forEach(year => {
            const nominalWage = wageData[year];
            if (nominalWage == null) {
                return;
            }

            const realWage = calculateRealWage(nominalWage, inflationData, year, baseYear);

            if (realWage !== null) {
                bulletData[year] = {
                    year,
                    nominal: nominalWage,
                    real: realWage,
                    baseYear
                };
            }
        });

        const validYearCount = Object.keys(bulletData).length;

        if (validYearCount === 0) {
            console.warn(`Bullet graph skipped: no intersecting data points for ${country}`);
            return null;
        }

        console.log(`Bullet graph data prepared for ${country}:`, validYearCount, "years (base year:", baseYear, ")");
        const intersectingYears = availableYears.filter(year => bulletData[year]);
        return { data: bulletData, years: intersectingYears, baseYear, baseNominal };

    } catch (error) {
        console.error("Error loading bullet graph data:", error);
        return null;
    }
}

export async function loadCountryComparisonSnapshot(country = "Portugal") {
    const targetCountry = country || "Portugal";

    if (comparisonSnapshotCache[targetCountry]) {
        return comparisonSnapshotCache[targetCountry];
    }

    try {
        const [inflationData, wageData] = await Promise.all([
            loadInflationByCategories(targetCountry),
            loadMinimumWageData(targetCountry)
        ]);

        const snapshot = {
            country: targetCountry,
            displayName: getDisplayCountryName(targetCountry) || targetCountry,
            inflation: null,
            wage: null
        };

        if (inflationData?.categories?.length) {
            const totalCategory = inflationData.categories.find(c => c.name === "Total");
            if (totalCategory?.values?.length) {
                const orderedValues = [...totalCategory.values].sort((a, b) => a.year - b.year);
                const latestEntry = orderedValues[orderedValues.length - 1];
                if (latestEntry?.value != null) {
                    snapshot.inflation = {
                        year: latestEntry.year,
                        value: latestEntry.value
                    };
                }
            }
        }

        if (wageData && Object.keys(wageData).length) {
            const wageYears = Object.keys(wageData)
                .map(year => +year)
                .filter(year => !isNaN(year))
                .sort((a, b) => a - b);

            if (wageYears.length) {
                const latestYear = wageYears[wageYears.length - 1];
                const nominalValue = wageData[latestYear];
                const baseYear = wageYears.includes(2012) ? 2012 : wageYears[0];
                const baseNominal = wageData[baseYear];
                const realValue = (nominalValue != null && inflationData)
                    ? calculateRealWage(nominalValue, inflationData, latestYear, baseYear)
                    : null;
                const realIndex = (realValue != null && baseNominal)
                    ? (realValue / baseNominal) * 100
                    : null;

                snapshot.wage = {
                    year: latestYear,
                    nominal: nominalValue,
                    real: realValue,
                    baseYear,
                    baseNominal,
                    index: realIndex
                };
            }
        }

        comparisonSnapshotCache[targetCountry] = snapshot;
        return snapshot;

    } catch (error) {
        console.error("Error loading comparison snapshot:", error);
        return null;
    }
}

/**
 * Load and process HICP data for Europe choropleth map
 */
export async function loadHICPData(country = "Portugal") {
    try {
        const data = await loadCSVData('data/HICP.csv');
        if (!data) {
            return null;
        }

        // Process data by year, country and category
        const processedData = {};
        const years = new Set();
        const categories = new Set();
        const countries = new Set();

        data.forEach(row => {
            const year = parseInt(row["01. Ano"]);
            const countryName = row["02. Nome País (Europa)"];
            const category = row["03. Filtro 1"];
            const valueStr = row["08. Valor"];

            // Skip invalid rows
            if (!year || !category || !valueStr || valueStr === 'x') {
                return;
            }

            const value = parseFloat(valueStr);
            if (isNaN(value)) {
                return;
            }

            // Add to sets
            years.add(year);
            categories.add(category);
            countries.add(countryName);

            // Create nested structure: year -> category -> value
            if (!processedData[year]) {
                processedData[year] = {};
            }
            if (!processedData[year][countryName]) {
                processedData[year][countryName] = {};
            }
            processedData[year][countryName][category] = value;
        });

        const hicpDataForCountry = {
            data: processedData,
            years: Array.from(years).sort((a, b) => a - b),
            categories: Array.from(categories).sort(),
            countries: Array.from(countries).sort(),
            selectedCountry: getPordataCountryName(country) || country
        };

        console.log(`HICP data loaded for ${country}:`, hicpDataForCountry.years.length, "years");
        return hicpDataForCountry;

    } catch (error) {
        console.error("Error loading HICP data:", error);
        return null;
    }
}

/**
 * Load and process income share data for the poorest 40%
 * Combines with inflation data for scatter plot analysis
 */
export async function loadIncomeAndInflationData(country = "Portugal") {
    try {
        const targetCountry = getPordataCountryName(country);

        // Load both datasets
        const [poorIncomeCSV, inflationData] = await Promise.all([
            loadCSVData('data/40-mais-pobres.csv'),
            loadInflationByCategories(country)
        ]);

        if (!poorIncomeCSV || !inflationData) {
            return null;
        }

        // Process income data for selected country
        const countryIncomeData = [];
        const yearsSet = new Set();

        poorIncomeCSV.forEach(row => {
            const year = parseInt(row["01. Ano"]);
            const countryName = row["02. Nome País (Europa)"];
            const valueStr = row["09. Valor"];

            if (countryName === targetCountry && year && valueStr && valueStr !== 'x') {
                const incomeShare = parseFloat(valueStr);
                if (!isNaN(incomeShare)) {
                    countryIncomeData.push({
                        year: year,
                        incomeShare: incomeShare
                    });
                    yearsSet.add(year);
                }
            }
        });

        // Sort by year
        countryIncomeData.sort((a, b) => a.year - b.year);

        // Get total inflation data for selected country
        const totalInflation = inflationData.categories.find(c => c.name === "Total");
        if (!totalInflation) {
            console.error("Total inflation data not found");
            return null;
        }

        // Combine data and calculate year-over-year variations
        const combinedData = [];

        for (let i = 0; i < countryIncomeData.length; i++) {
            const currentYear = countryIncomeData[i].year;
            const incomeShare = countryIncomeData[i].incomeShare;

            // Find inflation rate for current year
            const inflationRate = totalInflation.values.find(v => v.year === currentYear);

            // Calculate inflation variation (difference from previous year)
            let inflationVariation = null;
            const prevYear = currentYear - 1;
            const prevInflation = totalInflation.values.find(v => v.year === prevYear);

            if (inflationRate && prevInflation) {
                inflationVariation = inflationRate.value - prevInflation.value;
            }

            // Calculate income share variation (difference from previous year)
            let incomeVariation = null;
            if (i > 0) {
                const prevIncomeData = countryIncomeData[i - 1];
                // Only calculate if years are consecutive
                if (prevIncomeData.year === currentYear - 1) {
                    incomeVariation = incomeShare - prevIncomeData.incomeShare;
                }
            }

            if (inflationRate) {
                combinedData.push({
                    year: currentYear,
                    incomeShare: incomeShare,
                    inflationRate: inflationRate.value,
                    inflationVariation: inflationVariation,
                    incomeVariation: incomeVariation
                });
            }
        }

        const incomeDataForCountry = {
            data: combinedData,
            years: Array.from(yearsSet).sort((a, b) => a - b),
            country: targetCountry || country
        };

        console.log(`Income and inflation data combined for ${country}:`, incomeDataForCountry.data.length, "data points");
        return incomeDataForCountry;

    } catch (error) {
        console.error("Error loading income and inflation data:", error);
        return null;
    }
}
