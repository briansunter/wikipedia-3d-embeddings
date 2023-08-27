import React, { MutableRefObject, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrbitControls, Detailed, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { rgbToHsl } from "./utils";


const useRotation = (groupRef: MutableRefObject<any>, meshRefs: MutableRefObject<any[]>, camera: THREE.Camera, isRotating: boolean) => {
  useFrame(() => {
    if (groupRef.current && isRotating) { // Check for isRotating state here
      groupRef.current.rotation.y += 0.002;
    }
  });
};

const LoadingScreen = () => <div>Loading...</div>;
const Instructions = () => <div style={{ padding: "2px" }}>Use mouse to pan (right click + drag), zoom (scroll), and rotate (left click + drag).</div>;

interface DocumentNode {
  id: number;
  value: string;
  x: number;
  y: number;
  z: number;
}

const DocumentNode: React.FC<DocumentNode & { centroid: { x: number, y: number, z: number }, normalizationFactor: number }> = ({ id, value, x, y, z, centroid, normalizationFactor }) => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  const meshRefs = useContext(MeshContext);
  useEffect(() => {
    if (meshRefs) {
      meshRefs.current.push(meshRef);
    }
  }, [meshRefs]);

  useFrame(() => {

    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  const centeredCoords = useMemo(() => {
    const centeredX = (x - centroid.x) * normalizationFactor;
    const centeredY = (y - centroid.y) * normalizationFactor;
    const centeredZ = (z - centroid.z) * normalizationFactor;
    return { centeredX, centeredY, centeredZ };
  }, [x, y, z, centroid, normalizationFactor]);

  const colorStyle = useMemo(() => {
    const { centeredX, centeredY, centeredZ } = centeredCoords;
    const norm = Math.sqrt(centeredX ** 2 + centeredY ** 2 + centeredZ ** 2);
    const normX = centeredX / norm;
    const normY = centeredY / norm;
    const normZ = centeredZ / norm;

    const colorX = [255, 0, 0];
    const colorY = [0, 255, 0];
    const colorZ = [0, 0, 255];

    const blendedColor = [
      colorX[0] * Math.abs(normX) + colorY[0] * Math.abs(normY) + colorZ[0] * Math.abs(normZ),
      colorX[1] * Math.abs(normX) + colorY[1] * Math.abs(normY) + colorZ[1] * Math.abs(normZ),
      colorX[2] * Math.abs(normX) + colorY[2] * Math.abs(normY) + colorZ[2] * Math.abs(normZ)
    ];

    const [hue, saturation, lightness] = rgbToHsl(blendedColor[0], blendedColor[1], blendedColor[2]);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, [centeredCoords]);

  return (
    <Detailed distances={[0, 20000]}
    objects={meshRef.current ? [meshRef.current] : []}
      position={[centeredCoords.centeredX, centeredCoords.centeredY, centeredCoords.centeredZ]}>
      <Text
        ref={meshRef}
        font='helvetiker'
        fontSize={180}
        color={colorStyle}
        outlineColor={"black"}
        outlineWidth={3.5}
      >
        {value}
      </Text>
      <Sphere
        args={[120, 32, 32]}
        material={new THREE.MeshBasicMaterial({ color: colorStyle })}
      >
      </Sphere>
    </Detailed>
  );
};

const MeshContext = React.createContext<MutableRefObject<any[]> | null>(null);
const MeshProvider = ({ isRotating, children }: { isRotating: boolean, children: ReactNode }) => {
  const meshRefs = useRef([]);
  const groupRef = useRef<THREE.Group>(new THREE.Group());
  const { camera } = useThree();

  useRotation(groupRef, meshRefs, camera, isRotating);

  return (
    <MeshContext.Provider value={meshRefs}>
      <group ref={groupRef}>
        {children}
      </group>
    </MeshContext.Provider>
  );
};
const MenuBar: React.FC<{ children?: React.ReactNode, loadLargeGraph: () => void, loadSmallGraph: () => void}> = ({ children, loadLargeGraph, loadSmallGraph }) => {
  const [isOpen, setIsOpen] = useState(false);
  const openPopup = () => setIsOpen(true);
  const closePopup = () => setIsOpen(false);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: "#333" }}>
      <div style={{ color: 'white' }}>3D Wikipedia Embeddings</div>
      <div>
        <button style={{ marginRight: "10px" }} onClick={openPopup}>Learn More</button>
        <button style={{ marginRight: "10px" }} onClick={loadSmallGraph}>Load Small Graph</button>
        <button style={{ marginRight: "10px" }} onClick={loadLargeGraph}>Load Large Graph</button>
        {isOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px'
            }}>
              <h2>About this project</h2>
              <p>This project visualizes Wikipedia articles in 3D space using embeddings. Each node represents an article, and the distance between nodes indicates the similarity of the articles.</p>
              <p>by <a href="https://briansunter.com">Brian Sunter</a></p>
              <button onClick={closePopup}>Close</button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};


const DocumentVisualization: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const initialDocs: DocumentNode[] = [];
  const [graphSettings, setGraphSettings] = useState({
    documents: initialDocs,
    centroid: { x: 0, y: 0, z: 0 },
    normalizationFactor: 3000,
    minZoom: -10000,
    maxZoom: 8000,
    farDistance: 10000,
  });

  const toggleRotation = () => setIsRotating(!isRotating);

  const loadGraph = async (filePath: string, settings: any) => {
    setLoading(true);
    const response = await fetch(filePath);
    const data = await response.json();
    let totalX = 0, totalY = 0, totalZ = 0;
    data.forEach((doc: DocumentNode) => {
      totalX += doc.x;
      totalY += doc.y;
      totalZ += doc.z;
    });
    setGraphSettings({
      documents: data,
      centroid: {
        x: totalX / data.length,
        y: totalY / data.length,
        z: totalZ / data.length,
      },
      ...settings,
    });
    setLoading(false);
  };

  const loadLargeGraph = () => loadGraph("data/10k.json", { normalizationFactor: 18000, minZoom: -15000, maxZoom: 120000, farDistance: 1000000 });
  const loadSmallGraph = () => loadGraph("data/1k.json", { normalizationFactor: 5000, minZoom: -1000, maxZoom: 30000, farDistance: 300000 });

  useEffect(() => {
    loadSmallGraph()
  }, []);

  const [camera, setCamera] = useState<THREE.PerspectiveCamera>(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, graphSettings.farDistance));

  useEffect(() => {
    const newCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, graphSettings.farDistance);
    newCamera.position.z = graphSettings.farDistance;
    newCamera.far = graphSettings.farDistance;
    setCamera(newCamera);
  }, [graphSettings.farDistance]);

  return (
    <div>
      <MenuBar loadSmallGraph={loadSmallGraph} loadLargeGraph={loadLargeGraph}>
        <button onClick={toggleRotation}>{isRotating ? "Stop" : "Start"} Rotation</button>
      </MenuBar>
      {loading ? <LoadingScreen /> : null}
      <Instructions />
      <div className={className} style={{ width: "100vw", height: "100vh" }}>
        <Canvas camera={camera}
          style={{ backgroundColor: '#595959' }}>

          <MeshProvider isRotating={isRotating}>
            <OrbitControls
              enablePan={true}
              enableRotate={true}
              enableZoom={true}
              minDistance={graphSettings.minZoom}
              maxDistance={graphSettings.maxZoom}
            />
            {graphSettings.documents.map((doc: DocumentNode) => (
              <DocumentNode normalizationFactor={graphSettings.normalizationFactor} centroid={graphSettings.centroid} key={doc.id} {...doc} />
            ))}
          </MeshProvider>
        </Canvas>
      </div>
    </div>
  );
};

export default DocumentVisualization;