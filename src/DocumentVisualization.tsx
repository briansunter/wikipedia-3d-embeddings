import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import helvetiker from 'three/examples/fonts/helvetiker_regular.typeface.json'

const fontLoader = new FontLoader();
const sharedMaterial = new THREE.MeshPhongMaterial({emissiveIntensity: 40});

interface Document {
  id: number;
  value: string;
  x: number,
  y: number,
  z: number
}

const DocumentVisualization: React.FC<{ className?: string }> = ({ className }) => {
  const [documents, setDocuments] = useState<Document[]>([]);

const loadData = async (renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
  const response = await fetch('data/premapdocuments.json');
  let data = await response.json()

  const chunkSize = 500;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    setDocuments((prevDocuments) => [...prevDocuments, ...chunk]);
    create3DNodes(chunk, renderer, scene);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

useEffect(() => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  loadData(renderer, scene);
}, []);

return <div className={className}></div>;
}


const create3DNodes = (documents: Document[], renderer: THREE.WebGLRenderer, scene: THREE.Scene) => {
  // Set up the scene, camera, and renderer
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 5000);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.minDistance = -10;
  controls.maxDistance = 4000;
  let maxVal = -Infinity;

  documents.forEach(({ x, y, z }) => {
      if (x > maxVal) maxVal = x;
      if (y > maxVal) maxVal = y;
      if (z > maxVal) maxVal = z;
  });
  
  const normalizationFactor = 3000 / maxVal;
  // Create a 3D node for each document
  const createNode = (document: Document) => {
const font = fontLoader.parse(helvetiker);
const material = sharedMaterial.clone();
const geometry = new TextGeometry(document.value, {font, size: 8, height: 0.4});
const node = new THREE.Mesh(geometry, material);
updateMaterialColor(material, document);
    node.position.set(document.x * normalizationFactor, document.y * normalizationFactor, document.z * normalizationFactor);
    return node;
  };

  // Add the 3D nodes to the scene
  documents.forEach((doc) => {
    const node = createNode(doc);
    scene.add(node);
  });

  // Set the camera position
  camera.position.set(0, 0, 2000);
  camera.zoom = .5

  // Create an animation loop to render the 3D scene
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    updateTextNodesRotation(scene, camera);
  };
  animate();
};
const updateMaterialColor = (material: THREE.MeshPhongMaterial, document: Document) => {
  const color = new THREE.Color(document.x / 255, document.y / 255, document.z / 255);
  material.color = color;
  material.emissive = color;
};
const updateTextNodesRotation = (scene: THREE.Scene, camera: THREE.Camera) => {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry instanceof TextGeometry) {
      obj.lookAt(camera.position);
    }
  });
};
export default DocumentVisualization
