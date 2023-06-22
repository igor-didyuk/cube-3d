// Interpolated values from the vertex shader
varying lowp vec3 Position_worldspace;
varying lowp vec3 Normal_cameraspace;
varying lowp vec3 EyeDirection_cameraspace;
varying lowp vec3 LightDirection_cameraspace;

// Values that stay constant for the whole mesh.
uniform lowp vec3 LightPosition_worldspace;
uniform lowp vec4 uColor;
uniform lowp float LightPower;

void main() {
  // Light emission properties
  lowp vec3 LightColor = vec3(1,1,1);

  // Material properties
  lowp vec3 MaterialDiffuseColor = vec3(uColor);
  lowp vec3 MaterialAmbientColor = MaterialDiffuseColor;
  lowp vec3 MaterialSpecularColor = vec3(0.9,0.9,0.9);

  // Distance to the light
  lowp float distance = length( LightPosition_worldspace - Position_worldspace );

  // Normal of the computed fragment, in camera space
  lowp vec3 n = normalize( Normal_cameraspace );
  // Direction of the light (from the fragment to the light)
  lowp vec3 l = normalize( LightDirection_cameraspace );
  // Cosine of the angle between the normal and the light direction, clamped above 0
  //  - light is at the vertical of the triangle -> 1
  //  - light is perpendicular to the triangle -> 0
  //  - light is behind the triangle -> 0
  lowp float cosTheta = clamp(dot( n,l ), 0.0, 1.0);

  // Eye vector (towards the camera)
  lowp vec3 E = normalize(EyeDirection_cameraspace);
  // Direction in which the triangle reflects the light
  lowp vec3 R = reflect(-l,n);
  // Cosine of the angle between the Eye vector and the Reflect vector,
  // clamped to 0
  //  - Looking into the reflection -> 1
  //  - Looking elsewhere -> < 1
  lowp float cosAlpha = clamp(dot( E,R ), 0.0, 1.0);

  gl_FragColor = vec4(
	// Ambient : simulates indirect lighting
	MaterialAmbientColor +
	// Diffuse : "color" of the object
	MaterialDiffuseColor * LightColor * LightPower * cosTheta / (distance*distance) +
	// Specular : reflective highlight, like a mirror
	MaterialSpecularColor * LightColor * LightPower * pow(cosAlpha,1.0) / (distance*distance), uColor.w);
}
