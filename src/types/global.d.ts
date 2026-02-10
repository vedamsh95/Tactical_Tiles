import { ThreeElements, ReactThreeFiber } from '@react-three/fiber'
import * as THREE from 'three'

// Augment the 'react' module which provides the JSX namespace
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {
            group: ReactThreeFiber.Object3DNode<THREE.Group, typeof THREE.Group>;
            mesh: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
            ambientLight: ReactThreeFiber.Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
            directionalLight: ReactThreeFiber.Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
            planeGeometry: ReactThreeFiber.BufferGeometryNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>;
            meshBasicMaterial: ReactThreeFiber.MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>;
        }
    }
}

