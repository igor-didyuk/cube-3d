// Input vertex data, different for all executions of this shader.
attribute vec3 vertexPosition_modelspace;
attribute vec3 vertexNormal_modelspace;

// Output data ; will be interpolated for each fragment.
varying lowp vec3 Position_worldspace;
varying lowp vec3 Normal_cameraspace;
varying lowp vec3 EyeDirection_cameraspace;
varying lowp vec3 LightDirection_cameraspace;

// Values that stay constant for the whole mesh.
uniform mat4 uObjMatrix;
uniform mat4 uFaceRotMatrix;
uniform mat4 uRotMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uProjMatrix;

uniform lowp vec3 LightPosition_worldspace;
uniform int uMoving;

void main() {

  lowp mat4 positionMat = uObjMatrix;
  if (uMoving != 0) {
    positionMat = uFaceRotMatrix * positionMat;
  }
  positionMat = uMVMatrix * uRotMatrix * positionMat;
  lowp vec4 V = positionMat * vec4(vertexPosition_modelspace,1);


  // Output position of the vertex, in clip space : MVP * position
  gl_Position = uProjMatrix * V;

  // Position of the vertex, in worldspace
  Position_worldspace = V.xyz;

  // Vector that goes from the vertex to the camera, in camera space.
  // In camera space, the camera is at the origin (0,0,0).
  lowp vec3 vertexPosition_cameraspace = V.xyz;
  EyeDirection_cameraspace = vec3(0,0,0) - vertexPosition_cameraspace;

  // Vector that goes from the vertex to the light, in camera space.
  lowp vec3 LightPosition_cameraspace = vec4(LightPosition_worldspace,1).xyz;
  LightDirection_cameraspace = LightPosition_cameraspace + EyeDirection_cameraspace;

  // Normal of the the vertex, in camera space
  Normal_cameraspace = (positionMat * vec4(vertexNormal_modelspace,0)).xyz;
}
