const dom = require('../utils/dom.js');
const icons = require('../ui/Icons.js');
const ThumbnailNav = require('../ui/ThumbnailNav.js');
const Caption = require('../ui/Caption.js');
const EventEmitter = require("../utils/EventEmitter.js");
const isMobile = require("../utils/isMobile.js");
import {TweenLite, CSSPlugin} from "gsap/all";

// TO DO SCROLLABLE THUMBNAIL PANEL
module.exports = class Chrome {
    constructor(data, add_to_container) {
        this.data = data;
        this.events = new EventEmitter();
        this.thumbnails = {};
        this._active = true;
        this._fullscreen = false;
        this._turn_phone = false;
        this._message = "";
        this._vr = false;
        this.compass_offset = 75;
        this.el = {
            container: dom.createElement('div', 'svr-chrome'),
            header: dom.createElement('div', 'svr-chrome-header'),
            footer_button_container: dom.createElement('div', '', ["svr-button-container"]),
            header_button_container: dom.createElement('div', '', ["svr-button-container"]),
            footer: dom.createElement('div', 'svr-chrome-footer'),
            compass: {},
            compass_pointer: {},
            message: dom.createElement('div', 'svr-message')
        }

        this.buttons = {
            fullscreen: dom.createElement('div', 'svr-btn-fullscreen', ["svr-btn"], this.el.footer_button_container),
            cardboard: dom.createElement('div', 'svr-btn-cardboard', ["svr-btn"], this.el.footer_button_container)
        }

        this.title = new Caption(this.el.header);
        this.title.text = `<h2>${this.data.title}</h2><p>${this.data.desc}</p>`;

        this.el.compass = dom.createElement('div', 'svr-compass', [" "], this.el.header_button_container);
        this.el.compass_pointer = {};
        this.el.compass.innerHTML = icons.compass;
        this.el.compass_pointer = this.el.compass.querySelector('#svr-compass-pointer');

        this.buttons.fullscreen.innerHTML = icons.fullscreen;
        this.buttons.fullscreen.addEventListener('click', (e) => {this.onFullScreenButton(e)});

        this.buttons.cardboard.innerHTML = icons.cardboard;
        this.buttons.cardboard.addEventListener('click', (e) => {this.onCardboardButton(e)});
        // HEADER
        this.el.container.appendChild(this.el.header);
        this.el.header.appendChild(this.el.header_button_container);

        // FOOTER
        this.el.container.appendChild(this.el.footer);
        this.el.footer.appendChild(this.el.footer_button_container);
        this.caption = new Caption(this.el.footer);
        this.caption.text = this.data.scenes[0].caption;

        // THUMBNAILS
        this.thumbnails = new ThumbnailNav(this.data, this.el.footer);
        this.thumbnails.events.addListener("goto", (e) => {this.onThumbnailClick(e)})

        // MESSAGE
        this.el.container.appendChild(this.el.message);
        this.el.message.style.display = "none";

        if (isMobile.any) {
            this.buttons.fullscreen.style.display = "none";
        } else {
            this.buttons.cardboard.style.display = "none";
        }

        if (add_to_container) {
            add_to_container.appendChild(this.el.container);
        };
    }

    get vr() {
        return this._vr;
    }

    set vr(v) {
        this._vr = v;
        if (this._vr) {
            this.el.container.style.display = "none";
        } else {
            this.el.container.style.display = "block";
        }
    }

    get turn_phone() {
        return this._turn_phone;
    }

    set turn_phone(t) {
        this._turn_phone = t;
        if (this._turn_phone) {
            // SHOW MESSAGE
            this.message = "Place your phone into your Cardboard viewer";
            this.el.message.style.display = "flex";
        } else {
            this.el.message.style.display = "none";
        }
    }

    get compass() {
        let c = this.el.compass_pointer.getAttribute("transform");
        return c;
    }

    set compass(deg) {
        this.el.compass_pointer.setAttribute("transform", `rotate(${deg})`);
        this.el.compass_pointer.style.webkitTransform = `rotate(${deg}deg)`;
    }

    get active() {
        return this._active;
    }

    set active(a) {
        this._active = a;
    }

    get fullscreen() {
        return this._fullscreen;
    }

    get message() {
        return this._message;
    }

    set message(m) {
        this._message = m;
        this.el.message.innerHTML = `<div class="svr-message-container">${icons.cardboard_instruction} <p>${this._message}</p></div>`;
    }

    set fullscreen(f) {
        this._fullscreen = f;
        if (f) {
            this.buttons.fullscreen.innerHTML = icons.fullscreen_exit;
        } else {
            this.buttons.fullscreen.innerHTML = icons.fullscreen;
        }
    }

    toggleUI(a) {
        console.debug("Toggle UI");
        let active = this._active;

        if (a) {
            active = a;
        }

        if (active) {
            let footer_height = this.el.footer.offsetHeight;
            let header_height = this.el.header.offsetHeight;

            this._active = false;

            this.el.header.classList.remove("svr-active");
            this.el.header.classList.add("svr-inactive");
            this.el.header.style.top = `-${header_height - this.compass_offset}px`;

            this.el.footer.classList.remove("svr-active");
            this.el.footer.classList.add("svr-inactive");
            this.el.footer.style.bottom = `-${footer_height - 42}px`;


        } else {
            this._active = true;

            this.el.header.classList.remove("svr-inactive");
            this.el.header.classList.add("svr-active");
            this.el.header.style.top = "0px";

            this.el.footer.classList.remove("svr-inactive");
            this.el.footer.classList.add("svr-active");
            this.el.footer.style.bottom = "0px";
        }
    }

    updateChromePosition() {
        if (window.innerHeight < 400) {
            this.el.compass.style.display = "none";
            this.compass_offset = 0;
        } else {
            this.compass_offset = 75;
            this.el.compass.style.display = "block";
        }

        if (this._active) {
            this.el.header.style.top = "0px";
            this.el.footer.style.bottom = "0px";
        } else {
            let footer_height = this.el.footer.offsetHeight,
                header_height = this.el.header.offsetHeight;
            this.el.header.style.top = `-${header_height - this.compass_offset}px`;
            this.el.footer.style.bottom = `-${footer_height - 42}px`;
        }

    }

    onThumbnailClick(e) {
        this.caption.text = e.text;
        this.events.emit("goto", {number:e.number});
    }

    onFullScreenButton() {
        this.events.emit("fullscreen", {test:"testing"});
    }

    onCardboardButton() {
        this.events.emit("cardboard", {test:"testing"});
    }

    updateSize() {
        this.thumbnails.updateSize();
        this.updateChromePosition();
    }

}
