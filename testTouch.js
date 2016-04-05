		
			var container;

			var camera, scene, renderer;
			
			var ongoingTouches = new Array();
			
			var objFileToLoad = 'assets/objects/bb8.obj';			

			var mouseX = 0, mouseY = 0;
			var touches = null;
			
			var mTouchX = 0;
			var mTouchY = 0;
			
			var runUpdate = false;

			var windowHalfX = window.innerWidth / 2;
			var windowHalfY = window.innerHeight / 2;

			startup();
			init();
			animate();


			function startup() {
			  var el = document;
			  el.addEventListener("touchstart", handleStart, false);
			  el.addEventListener("touchend", handleEnd, false);
			  el.addEventListener("touchcancel", handleCancel, false);
			  el.addEventListener("touchmove", handleMove, false);
			  console.log("initialized.");
			}
			
			function handleStart(evt) {
			  evt.preventDefault();
			 console.log("touchstart.");
			  var el = document.getElementsByTagName("canvas")[0];
			  var ctx = el.getContext("2d");
			  touches = evt.changedTouches;
			  runUpdate = true;
			}
			
			function handleMove(evt) {
			  evt.preventDefault();
			  var el = document.getElementsByTagName("canvas")[0];
			  var ctx = el.getContext("2d");
			  touches = evt.changedTouches;
			  runUpdate = true;
			}
			
			function handleEnd(evt) {
			  evt.preventDefault();
			 console.log("touchend");
			  var el = document.getElementsByTagName("canvas")[0];
			  var ctx = el.getContext("2d");
			  touches = evt.changedTouches;
			  runUpdate = true;
			
			  
			}
			
			
			function handleCancel(evt) {
			  evt.preventDefault();
			 console.log("touchcancel.");
			  touches = evt.changedTouches;
			  runUpdate = true;
			}
			
			function init() {

				container = document.createElement( 'div' );
				document.body.appendChild( container );

				camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 1, 2000 );
				camera.position.z = -250;
				camera.position.y = 0;

				// scene

				scene = new THREE.Scene();

				var ambient = new THREE.AmbientLight( 0x101030 );
				scene.add( ambient );

				var directionalLight = new THREE.DirectionalLight( 0xffeedd );
				directionalLight.position.set( -4, 0, -5 );
				scene.add( directionalLight );

				// texture

				var manager = new THREE.LoadingManager();
				manager.onProgress = function ( item, loaded, total ) {

					console.log( item, loaded, total );

				};

				var texture = new THREE.Texture();

				var onProgress = function ( xhr ) {
					if ( xhr.lengthComputable ) {
						var percentComplete = xhr.loaded / xhr.total * 100;
						console.log( Math.round(percentComplete, 2) + '% downloaded' );
					}
				};

				var onError = function ( xhr ) {
				};


				var loader = new THREE.ImageLoader( manager );
				loader.load( 'assets/objects/UV_Grid_Sm.jpg', function ( image ) {

					texture.image = image;
					texture.needsUpdate = true;

				} );

				// model

				var loader = new THREE.OBJLoader( manager );
				loader.load( objFileToLoad, function ( object ) {

					object.traverse( function ( child ) {

						if ( child instanceof THREE.Mesh ) {

							child.material.map = texture;

						}

					} );

					object.position.y = - 95;
					scene.add( object );

				}, onProgress, onError );

				//

				renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				container.appendChild( renderer.domElement );

				document.addEventListener( 'mousemove', onDocumentMouseMove, false );

				//

				window.addEventListener( 'resize', onWindowResize, false );

			}

			function onWindowResize() {

				windowHalfX = window.innerWidth / 2;
				windowHalfY = window.innerHeight / 2;

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				renderer.setSize( window.innerWidth, window.innerHeight );

			}

			function onDocumentMouseMove( event ) {

				mouseX = ( event.clientX - windowHalfX ) / 2;
				mouseY = ( event.clientY - windowHalfY ) / 2;

			}

			//

			function animate() {

				requestAnimationFrame( animate );
				render();

			}

			function render() {
				
				camera.position.x += ( mouseX - camera.position.x ) * 0.25;
				camera.position.y += ( - mouseY - camera.position.y ) * 0.25;
				
								
				
				var xC = window.innerWidth/2;
				var yC = window.innerHeight/2;
			
				if (touches)
				{
					var dX =  touches[0].pageX;
					var dY = touches[0].pageY;
					
					//touches=null;
					
					
					runUpdate = false;
					mTouchX = (dX-xC);
					mTouchY = (dY-yC);
				
					console.log(mTouchX);
					
					camera.position.x += ( mTouchX - camera.position.x ) * .5;
					camera.position.y += ( mTouchY - camera.position.y ) * .5;
					
					
					
				
				}
				
				
				//mouseX = xC;
				//mouseY = yC;
				

				camera.lookAt( scene.position );

				renderer.render( scene, camera );

			}