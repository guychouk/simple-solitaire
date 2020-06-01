const CARD_WIDTH = 500;
const CARD_HEIGHT = 726;
const CARD_SIZE_X = CARD_WIDTH / 6;
const CARD_SIZE_Y = CARD_HEIGHT / 6;
const CANVAS_WIDTH = document.documentElement.clientWidth;
const CANVAS_HEIGHT = document.documentElement.clientHeight;
const SUITS_TO_COLORS = ['black', 'red', 'red', 'black']

const Sprites = new Image();
const GameState = { foundations: [], tableaus: [], cards: [], deck: null, win: false };

const canvas = document.createElement('CANVAS');
const ctx = canvas.getContext('2d');

Sprites.onload = Setup;
Sprites.src = 'cards-spritesheet.png';

let lastMousePoint;
let isDown = false;
let draggedCard = null;

Array.prototype.random = function() {
    let randomIndex = Math.floor(Math.random() * this.length);
    return [randomIndex, this[randomIndex]];
};

Array.prototype.last = function() {
    return this[this.length - 1];
};

function isColliding(rect1, rect2) {
    if (rect1.point.x < rect2.point.x + rect2.width &&
        rect1.point.x + rect1.width > rect2.point.x &&
        rect1.point.y < rect2.point.y + rect2.height &&
        rect1.point.y + rect1.height > rect2.point.y) {
        return true;
    }
    return false;
}

function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return new Point(evt.clientX - rect.left, evt.clientY - rect.top);
}

function isClicked(mousePoint, element) {
    let heightHit = mousePoint.y > element.point.y && mousePoint.y < element.point.y + element.height;
    let widthHit = mousePoint.x > element.point.x && mousePoint.x < element.point.x + element.width;
    return heightHit && widthHit;
}

function setWinState() {
    GameState.win = GameState.foundations.every(f => f.topCard && f.topCard.number === 13);
}

function Point(x,y) {
    this.x = x;
    this.y = y;
    this.translate = (xAmount, yAmount) => {
        this.x += xAmount;
        this.y += yAmount;
    }
}

function Deck(point) {
    this.cards = [];
    this.point = point;
    this.width = CARD_SIZE_X;
    this.height = CARD_SIZE_Y;
    this.reset = () => {
        GameState.cards = [...this.cards];
        this.cards = [];
    };
    this.remove = card => {
        this.cards.splice(this.cards.indexOf(card), 1);
    };
    this.push = card => {
        card.parent = this;
        card.hidden = false;
        card.point = new Point(this.point.x + CARD_SIZE_X + 50, this.point.y);
        card.origPoint = Object.assign({}, card.point);
        this.cards.push(card);
    };
    this.draw = () => {
        ctx.save();
        ctx.fillStyle = 'yellow';
        ctx.strokeStyle = 'white';
        ctx.fillRect(this.point.x, this.point.y, CARD_SIZE_X, CARD_SIZE_Y);
        ctx.strokeRect(this.point.x, this.point.y, CARD_SIZE_X, CARD_SIZE_Y);
        ctx.restore();
    };
}

function Card(number, suit, point = {x: 0, y: 0}) {
    this.children = [];
    this.parent = {};
    this.suit = suit;
    this.point = point;
    this.origPoint = {};
    this.color = SUITS_TO_COLORS[suit];
    this.width = CARD_SIZE_X;
    this.height = CARD_SIZE_Y;
    this.number = number;
    this.hidden = true;
    this.reset = () => {
        this.point = Object.assign({}, this.origPoint);
    }
    this.draw = () => {
        ctx.save();
        if (!this.hidden) {
            ctx.drawImage(Sprites, this.suit * CARD_WIDTH, (this.number - 1) * CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT, this.point.x, this.point.y, CARD_SIZE_X, CARD_SIZE_Y);
        } else {
            ctx.fillStyle = 'orange';
            ctx.strokeStyle = 'white';
            ctx.fillRect(this.point.x, this.point.y, CARD_SIZE_X, CARD_SIZE_Y);
            ctx.strokeRect(this.point.x, this.point.y, CARD_SIZE_X, CARD_SIZE_Y);
        }
        ctx.restore();
    };
}

function Foundation(point, suit) {
    this.suit = suit;
    this.nextNumber = 1;
    this.cards = [];
    this.width = CARD_SIZE_X + 5;
    this.height = CARD_SIZE_Y + 5;
    this.point = Object.assign({}, point);
    this.isPushable = card => this.suit === card.suit && this.nextNumber === card.number;
    this.push = card => {
        this.nextNumber += 1;
        card.point = new Point(this.point.x, this.point.y);
        card.origPoint = Object.assign({}, card.point);
        this.cards.push(card);
    };
    this.draw = () => {
        ctx.save();
        if (this.cards.length === 0) {
            ctx.fillStyle = 'darkblue';
            ctx.fillRect(this.point.x, this.point.y, this.width, this.height);
        } else {
            this.cards.forEach(c => c.draw());
        }
        ctx.restore();
    }
    Object.defineProperty(this, 'topCard', {
        get() {
            return this.cards[this.cards.length - 1];
        }
    });
}

function Tableau(point) {
    this.cards = [];
    this.point = Object.assign({}, point);
    this.width = CARD_SIZE_X;
    this.isPushable = card => {
        if (this.cards.length === 0) {
            return card.number === 13;
        }
        return this.topCard.color !== card.color && this.topCard.number === card.number + 1;
    };
    this.push = card => {
        card.point = new Point(this.point.x, this.point.y + (25 * this.cards.length));
        card.origPoint = Object.assign({}, card.point);
        card.parent = this;
        this.cards.push(card);
    };
    this.remove = card => {
        this.cards.splice(this.cards.indexOf(card), 1);
    };
    this.draw = () => {
        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.strokeRect(this.point.x, this.point.y, this.width, CARD_SIZE_Y);
        this.cards.forEach(c => c.draw());
        ctx.restore();
    };
    this.showCard = () => {
        this.topCard.hidden = false;
    };
    Object.defineProperty(this, 'topCard', {
        get() {
            return this.cards[this.cards.length - 1];
        }
    });
    Object.defineProperty(this, 'height', {
        get() {
            return this.cards.length * 25 + CARD_SIZE_Y;
        }
    });
}

function Setup() {
    canvas.onmouseup = function(e) { handleMouseUp(e); };
    canvas.onmousedown = function(e) { handleMouseDown(e); };
    canvas.onmousemove = function(e) { handleMouseMove(e); };

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = CANVAS_WIDTH;
    canvas.style.height = CANVAS_HEIGHT;

    canvas.style.cssText = "background-color: darkgreen; margin: 1vh 1vw 1vh 1vw;";
    document.getElementById('simple-solitaire').appendChild(canvas);

    const nextFoundationPoint = new Point(250, 10);
    const nextTableauPoint = new Point(CANVAS_WIDTH / 12, CANVAS_HEIGHT / 3.5)

    // Cards
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 13; j++) {
            GameState.cards.push(new Card(j + 1, i));
        }
    }

    // Foundations
    for (let i = 0; i < 4; i++) {
        let f = new Foundation(nextFoundationPoint, i);
        GameState.foundations.push(f);
        nextFoundationPoint.translate(140, 0);
    }

    // Tableaus
    for (let i = 0; i < 7; i++) {
        let t = new Tableau(nextTableauPoint);
        for (let j = 0; j < i + 1; j++) {
            let [index, randomCard] = GameState.cards.random();
            randomCard.hidden = j !== i;
            GameState.cards.splice(index, 1);
            t.push(randomCard);
        }
        GameState.tableaus.push(t);
        nextTableauPoint.translate(CARD_SIZE_X + 30, 0);
    }

    // Deck
    GameState.deck = new Deck(new Point(CANVAS_WIDTH - (CANVAS_WIDTH - 70), CANVAS_HEIGHT - 200));

    Draw();
}

function Draw() {
    ctx.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    GameState.foundations.forEach(f => f.draw());
    GameState.tableaus.forEach(t => t.draw());
    GameState.deck.draw();
    GameState.deck.cards.forEach(c => c.draw());
    if (GameState.win) {
        ctx.font = '30px Verdana';
        let gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop('0', 'magenta');
        gradient.addColorStop('0.5', 'blue');
        gradient.addColorStop('1.0', 'red');
        ctx.fillStyle = gradient;
        ctx.fillText('You Win!', CANVAS_WIDTH - (CANVAS_WIDTH - 450) , CANVAS_HEIGHT - 650);
    }
}

function handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    lastMousePoint = getMousePos(canvas, e);

    GameState.tableaus.forEach(t => {
        if (isClicked(lastMousePoint, t) && t.cards.length !== 0){
            let shownCards = t.cards.filter(c => !c.hidden);
            if (shownCards.length === 0) {
                t.showCard();
                return;
            }
            shownCards.reverse();
            let clickedCardIndex = shownCards.findIndex(c => isClicked(lastMousePoint, c));
            if (clickedCardIndex === 0) {
                draggedCard = shownCards[0];
            } else {
                draggedCard = shownCards.slice(0, clickedCardIndex + 1).reverse();
            }
        }
    });

    // Deck cards check
    GameState.deck.cards.forEach( c => {
        if (isClicked(lastMousePoint, c)) {
            draggedCard = c;
        }
    });

    // Deck click check
    if (isClicked(lastMousePoint, GameState.deck)) {
        if (GameState.cards.length === 0) {
            GameState.deck.reset();
            return;
        }
        GameState.deck.push(GameState.cards.pop());
    }

    isDown = true;
}

function handleMouseMove(e) {
    if (!isDown || !draggedCard) { return; }

    e.preventDefault();
    e.stopPropagation();

    let mousePoint = getMousePos(canvas, e);

    let dx = mousePoint.x - lastMousePoint.x;
    let dy = mousePoint.y - lastMousePoint.y;

    lastMousePoint = new Point(mousePoint.x, mousePoint.y);

    if (Array.isArray(draggedCard)){
        draggedCard.forEach(c => {
            c.point.x += dx;
            c.point.y += dy;
        });
    } else {
        draggedCard.point.x += dx;
        draggedCard.point.y += dy;
    }

    Draw();
}

function handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    let hitElement;

    if (draggedCard && !Array.isArray(draggedCard)) {
        hitElement = GameState.foundations.find(f => isColliding(draggedCard, f));
        hitElement = !hitElement ? GameState.tableaus.find(t => isColliding(draggedCard, t)) : hitElement;
        if (hitElement && hitElement.isPushable(draggedCard)) {
            draggedCard.parent.remove(draggedCard);
            hitElement.push(draggedCard);
            setWinState();
        } else {
            draggedCard.reset();
        }
        draggedCard = null;
    } else if (Array.isArray(draggedCard)) {
        let topCard = draggedCard[0];
        hitElement = GameState.tableaus.find(t => isColliding(topCard, t));
        if (hitElement && hitElement.isPushable(topCard)) {
            draggedCard.forEach(dc => {
                dc.parent.remove(dc);
                hitElement.push(dc);
            });
        } else {
            draggedCard.forEach(dc => dc.reset());
        }
        draggedCard = null;
    }

    isDown = false;

    Draw();
}
