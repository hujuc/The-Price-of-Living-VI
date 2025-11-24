/**
 * Utility Functions Module
 * Common helper functions used across visualizations
 */

/**
 * Wrap text to fit within a specified width
 * Used for long category labels in charts
 */
export function wrapText(text, width) {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = text.attr("y");
        const dy = 0;
        let tspan = text.text(null).append("tspan").attr("x", text.attr("x")).attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", text.attr("x")).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

/**
 * Initialize smooth scrolling for navigation links
 */
export function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

export function initBackToTop() {
    const button = document.getElementById('back-to-top');
    if (!button) {
        console.error('Back-to-top button not found in DOM');
        return;
    }

    console.log('Back-to-top button initialized');

    const toggleVisibility = () => {
        if (window.scrollY > 400) {
            button.classList.add('visible');
            console.log('Button visible at scroll:', window.scrollY);
        } else {
            button.classList.remove('visible');
        }
    };

    button.addEventListener('click', () => {
        console.log('Back-to-top button clicked');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();
}

// Empty-state utilities moved to empty-state.js to avoid browser caching issues.
