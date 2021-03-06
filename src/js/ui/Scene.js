// const UI = require('../ui/ui.js');
const data = require('../data/data.js');
const dom = require('../utils/dom.js');
const Stage = require('../ui/Stage.js');
const Pano = require('../ui/Pano.js');
const Chrome = require('../ui/Chrome.js');
const isMobile = require('../utils/isMobile.js');
import {TweenLite, CSSPlugin} from "gsap/TweenLite";
const plugins = [ CSSPlugin ];

module.exports = class Scene {
    constructor(config) {
        this.config = config;
        this.allow_mouse_hover_movement = true;
        this.el = {
            container: {},
            ui: {},
            loading: document.getElementById("svr-loading")
        };
        this.event_track = true;
        this._stereo = false;
        this._stereo_pending = false;
        this._orientation = "landscape";
        this.current_pano = 0;
        this.panos = [];
        this.user_interacting = false;
        this.user_first_interaction = false;
        this.temp_ui_active = true;
        this.pointer = {
            scaling: false,
            pinch: {
                start: 0,
                current:0,
                scale:0,
                current_scale:0
            },
            down_x: 0,
            down_y: 0,
            move_x: 0,
            move_y: 0,
            lat: 0,
            lon: 0,
            down_lon: 0,
            down_lat: 0,
            timer:0
        };
        this.animate_camera = new TweenLite(this.pointer);
        this.loaded = [];

        console.groupCollapsed("Device Information");
        console.debug(`Is Mobile Device = ${isMobile.any}`)
        console.debug(`The orientation is landscape? ${isMobile.orientation.landscape}`);
        console.debug(`Config Speed ${this.config.speed}`);
        console.groupEnd();

        // LOAD DATA
        data.getJSON(this.config.source).then(
            response => {
                this.data = response;
                this.buildTemplate();
                this.startListening();
                this.buildPanos();
                this.updateSize();
            },
            response => {
                console.error("FAILED TO LOAD DATA");
                console.log(response);
            }
        )

    }

    buildTemplate() {
        this.el.container = dom.createElement('section', 'scene-vr');

        if (isMobile.any) {
            this.el.container.classList.add("svr-mobile");
        }

        document.body.appendChild(this.el.container);

        this.stage = new Stage(this.config, this.el.container);
        this.chrome = new Chrome(this.data, this.el.container, this.config);

    }

    startListening() {
        this.stage.el.addEventListener('mousedown', (e) => {this.onMouseDown(e)});
        this.stage.el.addEventListener('mouseup', (e) => {this.onMouseUp(e)});

        if (!isMobile.any && this.allow_mouse_hover_movement) {
            this.el.container.addEventListener('mousemove', (e) => {this.onMouseMove(e)});
        }

        if (isMobile.any) {
            this.stage.el.addEventListener('touchstart', (e) => {this.onTouchStart(e)});
            this.stage.el.addEventListener('touchmove', (e) => {this.onTouchMove(e)});
            this.stage.el.addEventListener('touchend', (e) => {this.onTouchEnd(e)});
        }

        this.chrome.events.addListener("fullscreen", (e) => {
            this.fullScreenToggle(e);
            this.eventTrack("Fullscreen");
        })

        this.chrome.events.addListener("cardboard", (e) => {
            this.cardboardToggle(e);
            this.eventTrack("Cardboard");
        })

        this.chrome.events.addListener("goto", (e) => {
            this.goTo(e.number);
            this.eventTrack("GoTo", e.number);
        })

        this.chrome.events.addListener("next", (e) => {
            this.next(e);
            this.eventTrack("Next");
        })

        this.chrome.events.addListener("prev", (e) => {
            this.prev(e);
            this.eventTrack("Previous");
        })

        this.chrome.events.addListener("compass", (e) => {
            this.pointer.lon = 0;
            this.pointer.lat = 0;
            this.pointer.move_x = 0;
            this.pointer.move_y = 0;
            this.stage.resetCamera();
            this.eventTrack("Compass");
        })



    }

    fullScreenToggle(e) {
        let fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;

        if (!fullscreenElement) {
            this.chrome.fullscreen = true;
            if (this.el.container.requestFullscreen) {
                this.el.container.requestFullscreen();
            } else if (this.el.container.webkitRequestFullscreen) {
                this.el.container.webkitRequestFullscreen();
            } else if (this.el.container.mozRequestFullScreen) {
                this.el.container.mozRequestFullScreen();
            } else if (this.el.container.msRequestFullscreen) {
                this.el.container.msRequestFullscreen();
            }
        } else {
            this.chrome.fullscreen = false;
            if(document.exitFullscreen) {
                document.exitFullscreen();
            } else if(document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if(document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }

        }

        this.updateSize();
    }

    cardboardToggle(e) {
        if (this.stereo) {
            this.stereo = false;
        } else {
            this.stereo = true;
        }
        this.fullScreenToggle(e);
    }

    onTouchStart(e) {
        this.animate_camera.kill();
        let touch = event.touches[ 0 ];
        if (e.touches.length === 2) {
            console.log("Multitouch")
            this.pointer.scaling = true;
            this.onPinchStart(e);
            e.preventDefault();
        } else {

            this.pointer.scaling = false;
            this.pointer.timer = new Date();
            this.pointer.down_x = touch.screenX;
            this.pointer.down_y = touch.screenY;
            this.pointer.move_x = touch.screenX;
            this.pointer.move_y = touch.screenY;
            this.pointer.down_lon = 0;
            this.pointer.down_lat = 0;
        }

    }

    onTouchMove(e) {
        let touch = event.touches[ 0 ];
        if (this.pointer.scaling) {
            this.onPinchMove(e);
        } else {
            this.pointer.lon -= ( touch.screenX - this.pointer.move_x ) * 0.1;
            this.pointer.lat += ( touch.screenY - this.pointer.move_y ) * 0.1;
            this.pointer.move_x = touch.screenX;
            this.pointer.move_y = touch.screenY;
            this.stage.updateCameraTarget(this.pointer.lon, this.pointer.lat);
        }

        if (this.chrome.active) {
            this.chrome.toggleUI(true);
        }
    }

    onTouchEnd(e) {
        // this.pointer.lon = 0;
        // this.pointer.lat = 0;
        // this.pointer.move_x = 0;
        // this.pointer.move_y = 0;
    }

    onPinchStart(e) {
        this.pointer.pinch.start = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
    }

    onPinchMove(e) {
        if (e.touches.length === 2) {
            this.pointer.pinch.current = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            let range_scale = (this.pointer.pinch.current - this.pointer.pinch.start);

            this.pointer.pinch.scale = ((range_scale) / 100);
            if (this.pointer.pinch.scale > 1) {
                this.pointer.pinch.scale = 1;
            } else if (this.pointer.pinch.scale < 0) {
                this.pointer.pinch.scale = 1 + this.pointer.pinch.scale;
            }

            if (this.pointer.pinch.scale < -1) {
                this.pointer.pinch.scale = -1;
            }

            this.stage.scale = (this.pointer.pinch.scale);
        }

    }

    onPinchEnd(e) {
        this.pointer.pinch.current_scale = this.pointer.pinch.scale;
    }

    onMouseMove(e) {
        if (!this.user_first_interaction) {
            // this.stage.updateCameraTarget(this.pointer.lon, this.pointer.lat);
            this.pointer.move_x = e.clientX;
            this.pointer.move_y = e.clientY;
            let change_lon = (e.clientX * 0.1)/8;
            let change_lat = (e.clientY * 0.1)/8;

            this.animate_camera = new TweenLite(this.pointer, 1, {lon:change_lon, lat:change_lat ,onUpdate:(e) => {
                this.stage.updateCameraTarget(this.pointer.lon, this.pointer.lat);
            }})
        } else {
            if (this.user_interacting && this.chrome.active) {
                let pointer_x = Math.abs(this.pointer.down_x - e.clientX);
                let pointer_y = Math.abs(this.pointer.down_y - e.clientY);
                if (pointer_x > 10 || pointer_y > 10 ) {
                    this.chrome.toggleUI(true);
                }
            }
        }
    }

    onMouseDown(e) {
        if (!this.user_interacting) {
            this.user_interacting = true;
            this.user_first_interaction = true;
            this.temp_ui_active = this.chrome.active;
            this.el.container.removeEventListener('mousemove', (e) => {console.log(e)});

        }
        this.pointer.down_x = e.clientX;
        this.pointer.down_y = e.clientY;
        this.animate_camera.kill();

    }

    onMouseUp(e) {
        this.user_interacting = false;
        let pointer_x = Math.abs(this.pointer.down_x - e.clientX);
        let pointer_y = Math.abs(this.pointer.down_y - e.clientY);

        if (pointer_x < 10 && pointer_y < 10 ) {
            this.chrome.toggleUI();
        } else if (this.temp_ui_active) {
            this.chrome.toggleUI(false);
        }
    }

    buildPanos() {
        for (let i = 0; i < this.data.scenes.length; i++) {
            let pano = new Pano(this.data.scenes[i], this.config);
            pano.events.addListener("thumbnail_loaded", (e) => {
                this.onThumbnailLoaded(e, i)
            })
            this.panos.push(pano);
            this.stage.addPano(pano);
        }
        this.panos[this.current_pano].active = true;
    }

    onThumbnailLoaded(e, i) {
        if (i === 0) {
            this.el.loading.style.display = "none";
            this.el.loading.parentNode.removeChild(this.el.loading);
        }
    }

    goTo(n) {
        if (n != this.current_pano) {
            this.panos[this.current_pano].active = false;
            this.current_pano = n;
            this.panos[this.current_pano].active = true;
            this.user_interacting = false;
            this.user_first_interaction = false;
            this.chrome.current_thumbnail = this.current_pano;
        }

    }

    next(e) {
        let next_photo = this.current_pano + 1;
        if ((this.panos.length - 1) >= next_photo) {
            this.chrome.current_thumbnail = next_photo;
            this.goTo(next_photo);
        } else if (e.cardboard) {
            this.chrome.current_thumbnail = 0;
            this.goTo(0);
        }
    }

    prev(e) {
        let prev_photo = this.current_pano - 1;
        if (prev_photo >= 0) {
            this.chrome.current_thumbnail = prev_photo;
            this.goTo(prev_photo);
        }
    }

    eventTrack(a, v) {
        if (this.event_track && window.gtag) {
            let event_obj = {
                hitType: "event",
                eventCategory: a,
                eventAction: a,
                eventValue: ""
            }
            if (v) {
                event_obj.eventValue = v;
            }
            window.gtag('event', a, event_obj);

        }
    }

    get stereo() {
        return this._stereo;
    }

    set stereo(s) {
        if (this.stereo_pending) {
            this.stereo_pending = false;
        } else {
            if (s && this.orientation == "landscape") {
                this.stereo_pending = false;
                this._stereo = s;
                this.stage.stereo = this._stereo;
                this.chrome.vr = this._stereo;
            } else if (s && this.orientation == "portrait" ) {
                this.stereo_pending = true;
            } else {
                this._stereo = s;
                this.stage.stereo = this._stereo;
                this.chrome.vr = this._stereo;
                this.stereo_pending = false;
            }
        }

    }

    get stereo_pending() {
        return this._stereo_pending;
    }

    set stereo_pending(s) {
        this._stereo_pending = s;
        if (this._stereo_pending) {
            this.chrome.turn_phone = true;
        } else {
            this.chrome.turn_phone = false;
        }
    }

    get orientation() {
        if (window.matchMedia("(orientation: portrait)").matches) {
            this._orientation = "portrait";
        }

        if (window.matchMedia("(orientation: landscape)").matches) {
            this._orientation = "landscape";
        }
        return this._orientation;
    }

    set orientation(o) {
        this._orientation = o;
    }

    render() {
        if(this.stage) {
            this.stage.render();
        }
        if (this.chrome) {
            this.chrome.compass = Math.round(-this.stage.camera_angle-180);
        }
    }

    updateSize() {
        if(this.stage){
            // Check if orientation change
            let current_orientation = this._orientation;
            if (current_orientation != this.orientation) {
                // Orientation Changed
                if (this.stereo && this.orientation == "portrait") {
                    this.stereo = false;
                } else if (this.stereo_pending && this.orientation == "landscape") {
                    this.stereo_pending = false;
                    this.stereo = true;
                }
            }
            if (isMobile.apple) {
                let timer = setTimeout( () => {
                    this.stage.updateSize();
                    this.chrome.updateSize();
                }, 1000);
            } else {
                this.stage.updateSize();
                this.chrome.updateSize();
            }
        }
    }

    appendStage() {
        this.el.loading.style.visibility = "hidden";
        this.el.container.appendChild(this.el.ui);
    }

    static init_scene(window, config) {
        const version = 'Scene VR Version: 0.0.7 (2018-06-21)'; // how are we going to keep this up to date?
        console.info(version);
        if (isMobile.any && config.speed == "l") {
            config.speed = "m";
        }
        let scene = new Scene(config);

        function animate() {
            window.requestAnimationFrame(animate);
            scene.render();
        }

        function onResize() {
            console.debug("Window Resize");
            scene.updateSize();
        };

        animate();

        window.addEventListener('resize', onResize, false);
    }


}
