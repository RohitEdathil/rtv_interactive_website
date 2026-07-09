document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initGlowOrb();
    initSandbox();
});

/* --- SECTION NAVIGATION --- */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const logo = document.getElementById('logo');

    function switchSection(targetId) {
        // Remove active class from all sections and links
        sections.forEach(sec => {
            sec.classList.remove('active-section');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to target section
        const activeSection = document.getElementById(targetId);
        if (activeSection) {
            activeSection.classList.add('active-section');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Highlight matching link
        const activeLink = document.querySelector(`.nav-link[data-section="${targetId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update URL hash without jumping
        history.pushState(null, null, `#${targetId}`);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');
            switchSection(targetSection);
        });
    });

    // Logo click goes to home
    logo.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection('home');
    });

    // Handle initial load with hash routing
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        switchSection(hash);
    }
}

/* --- GLOW ORB MOUSE TRAILING --- */
function initGlowOrb() {
    const orb = document.getElementById('glow-orb');
    if (!orb) return;

    window.addEventListener('mousemove', (e) => {
        // Offset to keep cursor centered in the 400x400 orb
        orb.style.left = `${e.clientX}px`;
        orb.style.top = `${e.clientY}px`;
    });
}


/* --- CHAIN REACTION INTERACTIVE SANDBOX --- */
function initSandbox() {
    const gridEl = document.getElementById('sandbox-grid');
    const turnIndicator = document.getElementById('turn-indicator');
    const resetBtn = document.getElementById('reset-sandbox');

    if (!gridEl || !turnIndicator || !resetBtn) return;

    const ROWS = 5;
    const COLS = 5;
    let board = [];
    let currentPlayer = 1; // 1 = Green, 2 = Pink
    let gameActive = true;
    let turnsCount = 0;
    let isExploding = false; // Prevent clicks during chain reactions

    // Initialize board state matrix
    function resetBoardState() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board[r] = [];
            for (let c = 0; c < COLS; c++) {
                // Determine capacity based on grid position
                let capacity = 4; // Default center cell capacity
                if ((r === 0 || r === ROWS - 1) && (c === 0 || c === COLS - 1)) {
                    capacity = 2; // Corners
                } else if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
                    capacity = 3; // Edges
                }

                board[r][c] = {
                    r,
                    c,
                    player: null, // null, 1, or 2
                    dots: 0,
                    capacity: capacity
                };
            }
        }
        currentPlayer = 1;
        gameActive = true;
        turnsCount = 0;
        isExploding = false;
        updateTurnIndicator();
        renderBoard();
    }

    // Update Turn display text
    function updateTurnIndicator(winner = null) {
        if (winner) {
            turnIndicator.textContent = `Player ${winner} (${winner === 1 ? 'Green' : 'Pink'}) Wins!`;
            if (winner === 1) {
                turnIndicator.className = '';
            } else {
                turnIndicator.className = 'p2-turn';
            }
            return;
        }

        if (currentPlayer === 1) {
            turnIndicator.textContent = 'Player 1 (Green) Turn';
            turnIndicator.className = '';
        } else {
            turnIndicator.textContent = 'Player 2 (Pink) Turn';
            turnIndicator.className = 'p2-turn';
        }
    }

    // Render HTML representation of the board state
    function renderBoard() {
        gridEl.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cellState = board[r][c];
                const cellEl = document.createElement('div');
                cellEl.className = 'sandbox-cell';
                cellEl.dataset.r = r;
                cellEl.dataset.c = c;

                // Create container for dots
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'cell-dots-container';

                // Append dots based on state
                for (let d = 0; d < cellState.dots; d++) {
                    const dotEl = document.createElement('span');
                    dotEl.className = `dot player-${cellState.player}`;
                    dotsContainer.appendChild(dotEl);
                }

                cellEl.appendChild(dotsContainer);
                cellEl.addEventListener('click', () => handleCellClick(r, c));
                gridEl.appendChild(cellEl);
            }
        }
    }

    // Handle player cell click
    async function handleCellClick(r, c) {
        if (!gameActive || isExploding) return;

        const cell = board[r][c];
        
        // Can click if empty or if player already owns it
        if (cell.player === null || cell.player === currentPlayer) {
            cell.player = currentPlayer;
            cell.dots++;
            turnsCount++;

            isExploding = true; // Block subsequent clicks
            
            // Render initial placement
            renderBoard();

            // Run explosion chain if cell capacity reached
            await checkAndExplode();

            // Check win condition
            const winner = checkWinner();
            if (winner) {
                gameActive = false;
                updateTurnIndicator(winner);
            } else {
                // Switch turn
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                updateTurnIndicator();
            }

            isExploding = false;
        }
    }

    // Recursive explosion handler
    async function checkAndExplode() {
        let cellsToExplode = [];

        // Identify cells that exceed or equal capacity
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c].dots >= board[r][c].capacity) {
                    cellsToExplode.push(board[r][c]);
                }
            }
        }

        if (cellsToExplode.length === 0) {
            return; // Base case: no more explosions needed
        }

        // Process all explosions on this step simultaneously
        const explosionStepPromises = cellsToExplode.map(async (cell) => {
            const currentCellPlayer = cell.player;
            cell.dots = 0;
            cell.player = null;

            // Neighbors: Top, Bottom, Left, Right
            const neighbors = [
                { r: cell.r - 1, c: cell.c },
                { r: cell.r + 1, c: cell.c },
                { r: cell.r, c: cell.c - 1 },
                { r: cell.r, c: cell.c + 1 }
            ];

            neighbors.forEach(n => {
                if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
                    const neighborCell = board[n.r][n.c];
                    neighborCell.player = currentCellPlayer;
                    neighborCell.dots++;
                }
            });
        });

        await Promise.all(explosionStepPromises);
        
        // Render current state and wait 200ms for visual pacing
        renderBoard();
        
        // Check win condition during cascading explosions (game ends immediately if one player wipes another)
        const currentWinner = checkWinner();
        if (currentWinner) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 220));

        // Recursive call for cascading chain reaction
        await checkAndExplode();
    }

    // Check if one player has completely eliminated the other
    function checkWinner() {
        // Need at least 2 full turns played to win, to prevent P1 immediate win
        if (turnsCount < 2) return null;

        let p1Count = 0;
        let p2Count = 0;

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c].player === 1) p1Count++;
                if (board[r][c].player === 2) p2Count++;
            }
        }

        if (p1Count > 0 && p2Count === 0) return 1;
        if (p2Count > 0 && p1Count === 0) return 2;
        return null;
    }

    // Event listener for reset
    resetBtn.addEventListener('click', resetBoardState);

    // Initial load
    resetBoardState();
}
