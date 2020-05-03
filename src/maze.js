
// a maze is an array of walls with some metadata
const maze = {
  // could probably calculate floor based on walls
  floor: {
    height: 100,
    width: 100
  },
  walls: [
    // a wall is a start coord, end coord. coord puts wall on center of its thickness of the coords that are given
    {
      start: [0,0],
      end: [100, 0],
      width: 1,
      height: 10
    }
  ]
}

export default maze