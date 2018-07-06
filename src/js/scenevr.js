const Scene = require('./ui/Scene.js');

window.init_scene = function(c) {
    console.info('Scene VR Version: 0.0.7 (2018-06-21)');
    let scene = new Scene(c);

    function animate() {
        window.requestAnimationFrame(animate);
        scene.render();
    }

    function onResize() {
        console.debug("Window Resize");
        scene.updateSize();
    };

    animate();

    window.addEventListener( 'resize', onResize, false );
}
