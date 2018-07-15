const ProgressCube = require('./ui/ProgressCube.js');

let svr_config = {
    source: "/assets/test_panos/data.json",
    speed: "m"
};

let svr_time = {
    js_size: 1598345, //bytes
    estimated: 0,
    start: 0,
    end:0
}

function svr_init() {
    console.log("oldskool")

    // LOAD URL PARAMETERS
    function getQueryParams(query_params) {
        query_params = query_params.split("+").join(" ");

        var params = {},
            tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(query_params)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    const query_params = getQueryParams(window.location.search);
    if (query_params.hasOwnProperty('source')) {
        svr_config.source = query_params.source;
    }

    // LOAD SCENEVR JAVASCRIPT
    let script = document.createElement('script');
    script.onload = svr_init_scene;
    svr_time.start = (new Date()).getTime();
    // TODO: this src url is not portable to the CDN or S3 embeds
    script.src = "/js/scenevr.js";

    document.head.appendChild(script);

    let progress = new ProgressCube();

}

function svr_init_scene() {

    svr_time.end = (new Date()).getTime();

    let duration = (svr_time.end - svr_time.start) / 1000,
        bitsLoaded = svr_time.js_size * 8,
        speedBps = (bitsLoaded / duration).toFixed(2),
        speedKbps = (speedBps / 1024).toFixed(2),
        speedMbps = (speedKbps / 1024).toFixed(2),
        message = `connection speed ${speedMbps}Mbps`;

    if (speedMbps > 10) {
        svr_config.speed = "l";
    } else if (speedMbps > 5) {
        svr_config.speed = "m";
    } else {
        svr_config.speed = "s";
    }

    console.debug(`${message} SceneVR will use ${svr_config.speed} images`);
    document.getElementById("svr-loading-message").innerHTML = message;

    Scene.init_scene(window, svr_config);
}

// window.onload = svr_init;

window.SceneLoader = class SceneLoader {
    constructor(scenevr_url, config) {
        this.scenevr_url = scenevr_url;
        this.config = config;

        this.svr_time = {
            js_size: 1598345, //bytes
            estimated: 0,
            start: 0,
            end: 0
        }


    }

    load_scenevr() {
        console.log("class based")
        let script = document.createElement('script');
        var self = this;
        script.onload = function() {
            self.make_scene();
        }
        this.svr_time.start = (new Date()).getTime();

        script.src = this.scenevr_url;

        document.head.appendChild(script);

        let progress = new ProgressCube();
    }

    make_scene() {
        this.svr_time.end = (new Date()).getTime();

        let duration = (this.svr_time.end - this.svr_time.start) / 1000,
            bitsLoaded = this.svr_time.js_size * 8,
            speedBps = (bitsLoaded / duration).toFixed(2),
            speedKbps = (speedBps / 1024).toFixed(2),
            speedMbps = (speedKbps / 1024).toFixed(2),
            message = `connection speed ${speedMbps}Mbps`;

        if (speedMbps > 10) {
            this.config.speed = "l";
        } else if (speedMbps > 5) {
            this.config.speed = "m";
        } else {
            this.config.speed = "s";
        }

        console.debug(`${message} SceneVR will use ${svr_config.speed} images`);
        document.getElementById("svr-loading-message").innerHTML = message;

        Scene.init_scene(window, this.config);        
    }

}
