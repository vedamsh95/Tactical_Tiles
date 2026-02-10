import React from 'react';
import * as THREE from 'three';
import '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: React.DetailedHTMLProps<
        React.HTMLAttributes<THREE.Group> & {
          position?: [number, number, number];
          rotation?: [number, number, number];
        },
        THREE.Group
      >;
      mesh: React.DetailedHTMLProps<
        React.HTMLAttributes<THREE.Mesh> & {
          position?: [number, number, number];
          rotation?: [number, number, number];
          onPointerMove?: (e: any) => void;
          onClick?: (e: any) => void;
          onContextMenu?: (e: any) => void;
        },
        THREE.Mesh
      >;
      planeGeometry: React.DetailedHTMLProps<
        React.HTMLAttributes<THREE.PlaneGeometry> & {
          args?: [number, number];
        },
        THREE.PlaneGeometry
      >;
      meshBasicMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<THREE.MeshBasicMaterial> & {
          visible?: boolean;
        },
        THREE.MeshBasicMaterial
      >;
      ambientLight: React.DetailedHTMLProps<
        React.HTMLAttributes<THREE.AmbientLight> & {
          intensity?: number;
        },
        THREE.AmbientLight
      >;
      directionalLight: React.DetailedHTMLProps<
        React.HTMLAttributes<THREE.DirectionalLight> & {
          position?: [number, number, number];
          intensity?: number;
          castShadow?: boolean;
        },
        THREE.DirectionalLight
      >;
    }
  }
}
