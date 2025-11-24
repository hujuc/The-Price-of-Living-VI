# The Price of Living

An interactive data visualization application exploring inflation trends and their impact on living costs across European countries.

**University of Aveiro**
**Department of Electronics, Telecommunications and Informatics (DETI)**
**Information Visualisation - 2024/2025**

---

## Overview

The Price of Living is a web-based visualization tool that helps users understand how inflation affects cost of living, wages, and income distribution. Through interactive charts and comparative analysis, users can explore economic data from Portugal and other European countries.

## Features

- **Inflation by Category**: Interactive time-series visualization showing inflation rates across different goods and services categories
- **Radar Chart Analysis**: Multi-year comparison of inflation impact across product categories
- **Purchasing Power Analysis**: Bullet graph comparing nominal vs. real minimum wage over time
- **European Comparison**: Choropleth map displaying inflation rates (HICP) across European countries
- **Income Distribution Impact**: Scatter plot analyzing the relationship between inflation and income share of the poorest 40%
- **Country Comparison**: Side-by-side analysis with quadrant matrices and aligned real wage comparisons

## Data Sources

The application uses publicly available datasets from:

- **PORDATA**: Portuguese inflation, wage, and income distribution data
- **Eurostat**: Harmonised Index of Consumer Prices (HICP) and European wage data

### Datasets

- `inflacao-categorias-portugal.csv` - Inflation by category (Portugal)
- `salario-minimo-nacional.csv` - National minimum wage data
- `40-mais-pobres.csv` - Income share of poorest 40%
- `HICP.csv` - Harmonised Index of Consumer Prices (EU countries)
- `inflacao_portugal_europa.csv` - Comparative inflation data
- `salario_minimo_europa.csv` - European minimum wage data
- `europe-topology.json` - TopoJSON for map visualization

## Technology Stack

- **D3.js v7** - Data visualization library
- **HTML5/CSS3** - Structure and styling
- **Vanilla JavaScript (ES6 modules)** - Application logic
- **TopoJSON** - Efficient geographic data encoding

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd The-Price-of-Living-VI
   ```

2. Serve the application using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Node.js http-server
   npx http-server
   ```

3. Open `http://localhost:8000` in a web browser

Note: Opening `index.html` directly in a browser may cause CORS issues due to ES6 module imports.

## Project Structure

```
The-Price-of-Living-VI/
├── index.html              # Main application entry point
├── css/
│   └── styles.css          # Application styles
├── src/
│   ├── main.js            # Application initialization
│   └── modules/
│       ├── data-loader.js          # Data loading and processing
│       ├── line-chart.js           # Inflation timeline visualization
│       ├── radar-chart.js          # Category comparison radar
│       ├── bullet-graph.js         # Wage purchasing power
│       ├── choropleth-map.js       # European HICP map
│       ├── scatter-plot.js         # Income vs inflation analysis
│       ├── country-comparison.js   # Comparative analysis
│       ├── country-selector-map.js # Interactive country selection
│       ├── empty-state.js          # Empty state handling
│       └── utils.js                # Utility functions
└── data/
    └── [CSV and JSON datasets]
```

## Usage

1. **Country Selection**: Use the interactive map to select a country for analysis
2. **Inflation by Category**: Toggle between timeline and radar views to explore inflation trends
3. **Purchasing Power**: Select years from the dropdown to compare nominal vs. real wages
4. **European Context**: Adjust the year slider on the choropleth map to see inflation across Europe
5. **Income Analysis**: Switch between variation and timeline views to understand purchasing power changes
6. **Country Comparison**: Automatically compares selected country with Portugal

## Design Principles

- Human-centered iterative design process
- Progressive disclosure of complexity
- Interactive exploration over static presentation
- Clear visual encoding of quantitative relationships
- Accessibility through intuitive navigation and empty states

## Authors

- Angela Ribeiro - 109061 - angelammaribeiro@ua.pt
- Hugo Castro - 113889 - hugocastro@ua.pt

## Acknowledgements

Developed as part of the Information Visualisation course at the University of Aveiro under the supervision of Prof. Paulo Dias.

## License

This project was developed for academic purposes at the University of Aveiro.
