(function () {
  'use strict';

  function styleInject(css, ref) {
    if (ref === void 0) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === 'undefined') {
      return;
    }

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';

    if (insertAt === 'top') {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  var css_248z = "#solitaire {\n\tbox-sizing: border-box;\n\tbackground-color: darkgreen;\n\tmargin: 1vh 1vw 1vh 1vw;\n}\n";
  styleInject(css_248z);

  /*
   * TODO:
   * - Make each cards interactable
   * - Render the cards in the correct spots using the tableaus somehow
   * - Check collision on all of the shown cards, and then test for tableau, then for hidden
   */
  const CARD_WIDTH = 500;
  const CARD_HEIGHT = 726;
  const CARD_SIZE_X = CARD_WIDTH / 6;
  const CARD_SIZE_Y = CARD_HEIGHT / 6;
  const CANVAS_WIDTH = document.documentElement.clientWidth;
  const CANVAS_HEIGHT = document.documentElement.clientHeight;
  const SUITS_TO_COLORS = ['black', 'red', 'red', 'black'];
  const Sprites = new Image();
  const GameState = {
    elements: {
      foundations: [],
      tableaus: [],
      cards: [],
      deck: null
    },
    player: {}
  };
  const canvas = document.getElementById('game');
  /** @type CanvasRenderingContext2D */

  const ctx = canvas.getContext('2d');

  canvas.onmouseup = function (e) {
    handleMouseUp(e);
  };

  canvas.onmousedown = function (e) {
    handleMouseDown(e);
  };

  canvas.onmousemove = function (e) {
    handleMouseMove(e);
  };

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.width = CANVAS_WIDTH;
  canvas.style.height = CANVAS_HEIGHT;
  Sprites.onload = setup;
  Sprites.src = 'cards-spritesheet.png';
  let lastMousePoint;
  let isDown = false;
  let draggedCard = null;

  Array.prototype.random = function () {
    let randomIndex = Math.floor(Math.random() * this.length);
    return [randomIndex, this[randomIndex]];
  };

  Array.prototype.last = function () {
    return this[this.length - 1];
  };

  function isColliding(rect1, rect2) {
    if (rect1.point.x < rect2.point.x + rect2.width && rect1.point.x + rect1.width > rect2.point.x && rect1.point.y < rect2.point.y + rect2.height && rect1.point.y + rect1.height > rect2.point.y) {
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

  function Point(x, y) {
    this.x = x;
    this.y = y;

    this.translate = (xAmount, yAmount) => {
      this.x += xAmount;
      this.y += yAmount;
    };
  }

  function Deck(point) {
    this.cards = [];
    this.point = point;
    this.width = CARD_SIZE_X;
    this.height = CARD_SIZE_Y;

    this.reset = () => {
      GameState.elements.cards = [...this.cards];
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

  function Card(number, suit, point = {
    x: 0,
    y: 0
  }) {
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
    };

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
    };
  }

  function Tableau(point) {
    this.cards = [];
    this.point = Object.assign({}, point);
    this.width = CARD_SIZE_X;

    this.isPushable = card => {
      if (this.cards.length === 0 && card.number === 13) {
        return true;
      }

      return this.topCard.color !== card.color && this.topCard.number === card.number + 1;
    };

    this.push = card => {
      card.point = new Point(this.point.x, this.point.y + 25 * this.cards.length);
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

  function setup() {
    const nextFoundationPoint = new Point(250, 10);
    const nextTableauPoint = new Point(CANVAS_WIDTH / 12, CANVAS_HEIGHT / 2.8); // Cards

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 13; j++) {
        GameState.elements.cards.push(new Card(j + 1, i));
      }
    } // Foundations


    for (let i = 0; i < 4; i++) {
      let f = new Foundation(nextFoundationPoint, i);
      GameState.elements.foundations.push(f);
      nextFoundationPoint.translate(140, 0);
    } // Tableaus


    for (let i = 0; i < 7; i++) {
      let t = new Tableau(nextTableauPoint);

      for (let j = 0; j < i + 1; j++) {
        let [index, randomCard] = GameState.elements.cards.random();
        randomCard.hidden = j !== i;
        GameState.elements.cards.splice(index, 1);
        t.push(randomCard);
      }

      GameState.elements.tableaus.push(t);
      nextTableauPoint.translate(CARD_SIZE_X + 30, 0);
    } // Deck


    let deckPos = new Point(CANVAS_WIDTH - (CANVAS_WIDTH - 70), CANVAS_HEIGHT - 200);
    GameState.elements.deck = new Deck(deckPos);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    GameState.elements.foundations.forEach(f => f.draw());
    GameState.elements.tableaus.forEach(t => t.draw());
    GameState.elements.deck.draw();
    GameState.elements.deck.cards.forEach(c => c.draw());
  }

  function handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    lastMousePoint = getMousePos(canvas, e);
    GameState.elements.tableaus.forEach(t => {
      if (isClicked(lastMousePoint, t) && t.cards.length > 0) {
        let topCard = t.cards.last();

        if (topCard.hidden) {
          t.showCard();
        }

        draggedCard = topCard;
      }
    }); // Deck cards check

    GameState.elements.deck.cards.forEach(c => {
      if (isClicked(lastMousePoint, c)) {
        draggedCard = c;
      }
    }); // Deck click check

    if (isClicked(lastMousePoint, GameState.elements.deck)) {
      if (GameState.elements.cards.length === 0) {
        GameState.elements.deck.reset();
        return;
      }

      GameState.elements.deck.push(GameState.elements.cards.pop());
    }

    isDown = true;
  }

  function handleMouseMove(e) {
    if (!isDown || !draggedCard) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    let mousePoint = getMousePos(canvas, e);
    let dx = mousePoint.x - lastMousePoint.x;
    let dy = mousePoint.y - lastMousePoint.y;
    lastMousePoint = new Point(mousePoint.x, mousePoint.y);
    draggedCard.point.x += dx;
    draggedCard.point.y += dy;
    draw();
  }

  function handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    let hitElement;

    if (draggedCard) {
      hitElement = GameState.elements.foundations.find(f => isColliding(draggedCard, f));
      hitElement = !hitElement ? GameState.elements.tableaus.find(t => isColliding(draggedCard, t)) : hitElement;

      if (hitElement && hitElement.isPushable(draggedCard)) {
        draggedCard.parent.remove(draggedCard);
        hitElement.push(draggedCard);
      } else {
        draggedCard.reset();
      }

      draggedCard = null;
    }

    isDown = false;
    draw();
  }

}());
//# sourceMappingURL=game.js.map
