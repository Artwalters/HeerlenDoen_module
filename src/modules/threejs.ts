// THREE.js layer module for 3D models and image planes

import type { Map } from 'mapbox-gl';

// Global declarations for THREE.js
declare global {
  interface Window {
    THREE: typeof import('three');
    mapboxgl: typeof import('mapbox-gl');
  }
}

// Use THREE from global window
const THREE = window.THREE;
const mapboxgl = window.mapboxgl;

interface ModelConfig {
  id: string;
  origin: [number, number]; // [lat, lng]
  altitude: number;
  rotate: [number, number, number];
  url: string;
  scale: number;
}

interface ImagePlaneConfig {
  id: string;
  origin: [number, number];
  altitude: number;
  rotate: [number, number, number];
  imageUrl: string;
  width: number;
  height: number;
}

interface Transform {
  translateX: number;
  translateY: number;
  translateZ: number;
  rotate: [number, number, number];
  scale: number;
}

// 3D model configurations
const modelConfigs: ModelConfig[] = [
  {
    id: 'schunck',
    origin: [50.88778235149691, 5.979389928151281], // [lat, lng]
    altitude: 0,
    rotate: [Math.PI / 2, 0.45, 0],
    url: 'https://cdn.jsdelivr.net/gh/Artwalters/3dmodels_heerlen@main/schunckv5.glb',
    scale: 1.3,
  },
  {
    id: 'theater',
    origin: [50.886541206107225, 5.972454838314243],
    altitude: 0,
    rotate: [Math.PI / 2, 2.05, 0],
    url: 'https://cdn.jsdelivr.net/gh/Artwalters/3dmodels_heerlen@main/theaterheerlenv4.glb',
    scale: 0.6,
  },
];

// Image plane configuration
const imagePlaneConfig: ImagePlaneConfig = {
  id: 'image1',
  origin: [50.88801513786042, 5.980644311376565],
  altitude: 6.5,
  rotate: [Math.PI / 2, 0.35, 0],
  imageUrl:
    'https://daks2k3a4ib2z.cloudfront.net/671769e099775386585f574d/67adf2bff5be8a200ec2fa55_osgameos_mural-p-130x130q80.png',
  width: 13,
  height: 13,
};

/**
 * Create image plane for THREE.js
 * @param config - Image plane configuration
 * @return Promise that resolves to the image plane mesh
 */
function createImagePlane(config: ImagePlaneConfig): Promise<THREE.Mesh> {
  // Convert coordinates
  const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(
    [config.origin[1], config.origin[0]],
    config.altitude
  );

  // Calculate scale
  const meterScale = mercatorCoord.meterInMercatorCoordinateUnits();
  const geoWidth = config.width * meterScale;
  const geoHeight = config.height * meterScale;

  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      config.imageUrl,
      (texture) => {
        // Create material
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        });

        // Create geometry
        const geometry = new THREE.PlaneGeometry(geoWidth, geoHeight);
        const plane = new THREE.Mesh(geometry, material);

        // Store transform data
        plane.userData.transform = {
          translateX: mercatorCoord.x,
          translateY: mercatorCoord.y,
          translateZ: mercatorCoord.z,
          rotate: config.rotate,
          scale: 1,
        } as Transform;

        resolve(plane);
      },
      undefined,
      (error) => reject(error)
    );
  });
}

interface CustomLayer {
  id: string;
  type: 'custom';
  renderingMode: '3d';
  map?: Map;
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  renderer?: THREE.WebGLRenderer;
  onAdd: (map: Map, gl: WebGLRenderingContext) => void;
  render: (gl: WebGLRenderingContext, matrix: number[]) => void;
}

/**
 * Create custom THREE.js layer
 * @return Custom layer object for Mapbox
 */
export function createThreeJSLayer(): CustomLayer {
  return {
    id: '3d-models',
    type: 'custom',
    renderingMode: '3d',

    onAdd: function (map: Map, gl: WebGLRenderingContext) {
      this.map = map;
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();

      // Setup lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.57);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.55);
      directionalLight.color.setHex(0xfcfcfc);

      // Position light
      const azimuth = 210 * (Math.PI / 180);
      const polar = 50 * (Math.PI / 180);
      directionalLight.position
        .set(
          Math.sin(azimuth) * Math.sin(polar),
          Math.cos(azimuth) * Math.sin(polar),
          Math.cos(polar)
        )
        .normalize();
      this.scene.add(directionalLight);

      // Setup renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      this.renderer.autoClear = false;

      // Load 3D models
      const loader = new (THREE as any).GLTFLoader();
      modelConfigs.forEach((config) => {
        // Convert coordinates
        const mercCoord = mapboxgl.MercatorCoordinate.fromLngLat(
          [config.origin[1], config.origin[0]],
          config.altitude
        );

        // Load model
        loader.load(
          config.url,
          (gltf: any) => {
            const scene3D = gltf.scene;

            // Store transform data
            scene3D.userData.transform = {
              translateX: mercCoord.x,
              translateY: mercCoord.y,
              translateZ: mercCoord.z,
              rotate: config.rotate,
              scale: mercCoord.meterInMercatorCoordinateUnits() * config.scale,
            } as Transform;

            this.scene!.add(scene3D);
          },
          undefined,
          (err: any) => {/* Error loading model */}
        );
      });

      // Load image plane
      createImagePlane(imagePlaneConfig)
        .then((plane) => {
          this.scene!.add(plane);
        })
        .catch((err) => {/* Error loading image plane */});
    },

    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      // Get Mapbox matrix
      const mapMatrix = new THREE.Matrix4().fromArray(matrix);

      // Apply transforms to each object
      this.scene!.traverse((child) => {
        if (child.userData.transform) {
          const t = child.userData.transform as Transform;

          // Create transform matrices
          const translation = new THREE.Matrix4().makeTranslation(
            t.translateX,
            t.translateY,
            t.translateZ
          );
          const scaling = new THREE.Matrix4().makeScale(t.scale, -t.scale, t.scale);
          const rotX = new THREE.Matrix4().makeRotationX(t.rotate[0]);
          const rotY = new THREE.Matrix4().makeRotationY(t.rotate[1]);
          const rotZ = new THREE.Matrix4().makeRotationZ(t.rotate[2]);

          // Combine transforms
          const modelMatrix = new THREE.Matrix4()
            .multiply(translation)
            .multiply(scaling)
            .multiply(rotX)
            .multiply(rotY)
            .multiply(rotZ);

          // Apply transformation
          child.matrix = new THREE.Matrix4().copy(mapMatrix).multiply(modelMatrix);
          child.matrixAutoUpdate = false;
        }
      });

      // Render scene
      this.renderer!.resetState();
      this.renderer!.render(this.scene!, this.camera!);
    },
  };
}

/**
 * Setup THREE.js layer on map
 * @param map - The mapbox map instance
 */
export function setupThreeJSLayer(map: Map): void {
  // Add THREE.js layer when map style is loaded
  map.on('style.load', () => {
    const customLayer = createThreeJSLayer();
    map.addLayer(customLayer);
  });
}