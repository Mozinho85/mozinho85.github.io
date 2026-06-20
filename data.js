// Static game data: unlockable ball styles + nation kits/flags.
// Loaded as a classic script BEFORE game.js so these globals are available.

const ballStyles = [
    { 
        name: 'Classic Pentagons', 
        req: 0, 
        primary: '#ffffff', 
        secondary: '#111111', 
        style: 'classic-3d',
        seams: '#cccccc',
        shine: 'rgba(255,255,255,0.4)'
    },
    { 
        name: 'Vortex Quantum', 
        req: 10, 
        primary: '#00b4db', 
        secondary: '#003057', 
        style: 'vortex-3d',
        seams: '#00f0ff',
        shine: 'rgba(255,255,255,0.6)'
    },
    { 
        name: 'Magma Fuse', 
        req: 25, 
        primary: '#ff416c', 
        secondary: '#8a001c', 
        style: 'panel-3d',
        seams: '#ff4b2b',
        shine: 'rgba(255,255,255,0.5)'
    },
    { 
        name: 'Chrono Matrix', 
        req: 50, 
        primary: '#11998e', 
        secondary: '#0b4e47', 
        style: 'matrix-3d',
        seams: '#38ef7d',
        shine: 'rgba(200,255,220,0.5)'
    },
    { 
        name: 'Shadow Carbon', 
        req: 75, 
        primary: '#232526', 
        secondary: '#0f2027', 
        style: 'carbon-3d',
        seams: '#414345',
        shine: 'rgba(255,255,255,0.2)'
    },
    { 
        name: 'Golden Matchball', 
        req: 100, 
        primary: '#f7b500', 
        secondary: '#8a6400', 
        style: 'panel-3d',
        seams: '#fff7ad',
        shine: 'rgba(255,255,255,0.7)'
    }
];

// ACCURATE REAL-WORLD KIT PROFILES & VECTOR CSS FLAG CONFIGURATIONS
const nations = [
    { 
        name: 'Argentina', tag: 'ARG', 
        color: '#74ACDF', keeperColor: '#111111', 
        kitStyle: 'stripes', stripeColor: '#ffffff', detailColor: '#f7b500', 
        flagCSS: 'background: linear-gradient(#74ACDF 33.3%, #ffffff 33.3%, #ffffff 66.6%, #74ACDF 66.6%);'
    },
    { 
        name: 'Brazil', tag: 'BRA', 
        color: '#FEDF00', keeperColor: '#12a454', 
        kitStyle: 'solid', stripeColor: '#009c3b', detailColor: '#002395',
        flagCSS: 'background: #009c3b; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);' // Rendered natively with internal yellow diamond via canvas / fallback
    },
    { 
        name: 'England', tag: 'ENG', 
        color: '#ffffff', keeperColor: '#ff5722', 
        kitStyle: 'solid', stripeColor: '#ffffff', detailColor: '#0f2042',
        flagCSS: 'background: #fff; background-image: linear-gradient(90deg, transparent 42%, #ce1124 42%, #ce1124 58%, transparent 58%), linear-gradient(#ce1124 42%, #ce1124 58%, transparent 58%); background-size: 100% 100%;'
    },
    { 
        name: 'France', tag: 'FRA', 
        color: '#002395', keeperColor: '#f1c40f', 
        kitStyle: 'solid', stripeColor: '#002395', detailColor: '#ffffff',
        flagCSS: 'background: linear-gradient(90deg, #002395 33.3%, #ffffff 33.3%, #ffffff 66.6%, #ed2939 66.6%);'
    },
    { 
        name: 'Germany', tag: 'GER', 
        color: '#ffffff', keeperColor: '#ff007f', 
        kitStyle: 'shoulders', stripeColor: '#111111', detailColor: '#dbf200',
        flagCSS: 'background: linear-gradient(#000 33.3%, #dd0000 33.3%, #dd0000 66.6%, #ffce00 66.6%);'
    },
    { 
        name: 'Spain', tag: 'ESP', 
        color: '#c60b1e', keeperColor: '#2ecc71', 
        kitStyle: 'solid', stripeColor: '#c60b1e', detailColor: '#f7b500',
        flagCSS: 'background: linear-gradient(#c60b1e 25%, #f7b500 25%, #f7b500 75%, #c60b1e 75%);'
    },
    { 
        name: 'USA', tag: 'USA', 
        color: '#ffffff', keeperColor: '#00b4db', 
        kitStyle: 'sleeves', stripeColor: '#0a3161', detailColor: '#ce1124',
        flagCSS: 'background: #fff; background-image: linear-gradient(#b22234 50%, transparent 50%); background-size: 100% 15.38%;'
    },
    { 
        name: 'Mexico', tag: 'MEX', 
        color: '#006847', keeperColor: '#a800ff', 
        kitStyle: 'pattern', stripeColor: '#ffffff', detailColor: '#ce1124',
        flagCSS: 'background: linear-gradient(90deg, #006847 33.3%, #ffffff 33.3%, #ffffff 66.6%, #ce1124 66.6%);'
    },
    { 
        name: 'Portugal', tag: 'POR', 
        color: '#ff0000', keeperColor: '#34495e', 
        kitStyle: 'halves', stripeColor: '#006847', detailColor: '#f7b500',
        flagCSS: 'background: linear-gradient(90deg, #006622 40%, #ff0000 40%);'
    }
];
