import { fitRoomCamera, ROOM_SIZE } from './roomGeometry';

test.each([{left:24,top:136,width:342,height:406}, {left:24,top:78,width:277,height:218},
  {left:24,top:86,width:1232,height:490}])('the room fits the available workspace with its original aspect ratio: %j', viewport => {
  const camera = fitRoomCamera(viewport);
  expect(camera.left).toBeGreaterThanOrEqual(viewport.left - .001);
  expect(camera.top).toBeGreaterThanOrEqual(viewport.top - .001);
  expect(camera.left + ROOM_SIZE.width * camera.scale).toBeLessThanOrEqual(viewport.left + viewport.width + .001);
  expect(camera.top + ROOM_SIZE.height * camera.scale).toBeLessThanOrEqual(viewport.top + viewport.height + .001);
  expect(ROOM_SIZE.width / ROOM_SIZE.height).toBeCloseTo(1672 / 941);
});

test('overhanging footprints fit without changing their anchors or accounting for an invisible old rug box', () => {
  const viewport={left:24,top:86,width:900,height:500};
  const footprints=[{x:1580,y:800,width:300,height:260},{x:100,y:700,width:300,height:150}];
  const original=JSON.stringify(footprints);
  const camera=fitRoomCamera(viewport,footprints);
  footprints.forEach(item=>{
    expect(camera.left+(item.x-item.width/2)*camera.scale).toBeGreaterThanOrEqual(viewport.left-.001);
    expect(camera.left+(item.x+item.width/2)*camera.scale).toBeLessThanOrEqual(viewport.left+viewport.width+.001);
    expect(camera.top+(item.y+item.height/2)*camera.scale).toBeLessThanOrEqual(viewport.top+viewport.height+.001);
  });
  expect(JSON.stringify(footprints)).toBe(original);
  expect(fitRoomCamera(viewport,[{x:800,y:900,width:720,height:220}]).scale)
    .toBeGreaterThan(fitRoomCamera(viewport,[{x:800,y:900,width:720,height:460}]).scale);
});
