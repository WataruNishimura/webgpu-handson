if (!navigator.gpu) {
  throw new Error("WebGPU is not supported in this browser");
}

const GRID_SIZE = 4;

(async function () {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No adapter found");
  }
  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("No device found");
  }

  const canvas = document.querySelector("canvas");

  if (!canvas) {
    throw new Error("No canvas found");
  }

  const context = canvas.getContext("webgpu")!;

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({ device, format: canvasFormat });

  const encoder = device.createCommandEncoder();

  const vertices = new Float32Array([
    //   X,    Y,
    -0.8,
    -0.8, // Triangle 1 (Blue)
    0.8,
    -0.8,
    0.8,
    0.8,

    -0.8,
    -0.8, // Triangle 2 (Red)
    0.8,
    0.8,
    -0.8,
    0.8,
  ]);

  const vertexBuffer = device.createBuffer({
    label: "Cell vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);
  const vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 8,
    attributes: [
      {
        format: "float32x2",
        offset: 0,
        shaderLocation: 0, // Position, see vertex shader
      },
    ],
  };

  const cellShaderModule = device.createShaderModule({
    label: "Cell Shader",
    code: `
    @vertex
    fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
      return vec4f(pos, 0, 1);
    }

    @fragment
    fn fragmentMain() -> @location(0) vec4f {
      return vec4f(1, 0, 0, 1);
    }
    `,
  });

  const cellPipeline = device.createRenderPipeline({
    label: "cell pipeline",
    layout: "auto",
    vertex: {
      module: cellShaderModule,
      entryPoint: "vertexMain",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: "fragmentMain",
      targets: [
        {
          format: canvasFormat,
        },
      ],
    },
  });

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0.4, a: 1 },
        storeOp: "store",
      },
    ],
  });
  pass.setPipeline(cellPipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.draw(vertices.length / 2);
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

})();
