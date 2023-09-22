let canvas_element = document.getElementById('canvas_element')! as HTMLCanvasElement;
let canvas_ctx = canvas_element.getContext('2d')!;

canvas_element.width = document.body.clientWidth;
canvas_element.height = document.body.clientHeight;

canvas_ctx.translate(canvas_element.width / 2, canvas_element.height / 2);

class Grid {
    cells: Array<number>
    width: number
    height: number
    capacity: number

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.capacity = this.width * this.height;
        this.cells = new Array(this.capacity).fill(0);
    }

    get_item(x: number, y: number) : number {
        return this.cells[(Math.ceil(x) % this.width) + ((Math.ceil(y) % this.height) * this.width)];
    }

    set_item(x: number, y: number, value: number) {
        this.cells[(Math.ceil(x) % this.width) + ((Math.ceil(y) % this.height) * this.width)] = value;
    }
}

class CellCluster {
    x: number
    y: number
    width: number
    height: number
    grid: Grid
    cached_alive_cells_count: number
    average_alive_cells_count: number
    alive_cells_delta: number
    paused: boolean

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.cached_alive_cells_count = 1;
        this.average_alive_cells_count = 1;
        this.alive_cells_delta = 1;
        this.paused = false;
        this.grid = new Grid(width, height);
    }

    coords_inside(x: number, y: number) : boolean {
        return ((x >= this.x) && (x < (this.x + this.width))) && ((y >= this.y) && (y < (this.y + this.height)));
    }

    count_alive_cells() : number {
        if (this.paused) {
            return this.cached_alive_cells_count;
        }

        let alive_cells = 0;
        
        for (let cell of this.grid.cells) {
            if (cell > 0) {
                alive_cells++;
            }
        }

        let before = this.average_alive_cells_count;
        this.average_alive_cells_count = Math.round(((this.average_alive_cells_count + alive_cells) / 2) * 100) / 100;
        this.alive_cells_delta = Math.round((this.average_alive_cells_count - before) * 100) / 100;

        this.cached_alive_cells_count = alive_cells;

        return alive_cells;
    }

    set_cell(x: number, y: number, value: number) {
        return this.grid.set_item(x - this.x, y - this.y, value);
    }

    get_cell(x: number, y: number) : number {
        return this.grid.get_item(x - this.x, y - this.y);
    }
}

class Life {
    clusters: Array<CellCluster>
    steps: number

    constructor() {
        this.clusters = new Array();
        this.steps = 0;
    }

    get_cell(x: number, y: number) : number {
        for (let i=0; i < this.clusters.length; i++) {
            let cluster = this.clusters[i];

            if (cluster.coords_inside(x, y)) {
                return cluster.get_cell(x, y);
            }
        }
        
        return 0;
    }

    set_cell(x: number, y: number, value: number) {
        for (let i=0; i < this.clusters.length; i++) {
            let cluster = this.clusters[i];

            if (cluster.coords_inside(x, y)) {
                if (value > 0) {
                    cluster.paused = false;
                }
                
                cluster.set_cell(x, y, value);
                return;
            }
        }
        
        let new_cluster = new CellCluster(Math.floor((x / 32)) * 32, (Math.floor(y / 32) * 32), 32, 32);

        new_cluster.set_cell(x, y, value);

        this.clusters.push(new_cluster);
    }

    get_neighborhood(x: number, y: number) : [Array<[number, number]>, Array<number>, number] {
        let neighborhood: Array<[number, number]> = [
            [x -1, y +1], [x, y +1], [x +1, y +1],
            [x -1, y], [x +1, y],
            [x -1, y -1], [x, y -1], [x +1, y -1],
        ];

        let neighborhood_state: Array<number> = new Array();

        for (let [x, y] of neighborhood) {
            neighborhood_state.push(this.get_cell(x, y));
        }

        let neighborhood_alives = 0;

        for (let i=0; i < neighborhood_state.length; i++) {
            if (neighborhood_state[i] == 1) {
                neighborhood_alives++;
            }
        }

        return [neighborhood, neighborhood_state, neighborhood_alives];
    }

    step() {
        let should_die: Array<[number, number, number]> = new Array();
        let should_grow: Array<[number, number, number]> = new Array();

        let coords: Array<[number, number]> = new Array();

        for (let cluster of this.clusters) {
            for (let y=0; y < cluster.height +2; y++) {
                for (let x=0; x < cluster.width +2; x++) {
                    coords.push([(cluster.x -1) + x, (cluster.y -1) + y]);
                }
            }
        }

        for (let [x, y] of coords) {
            let cell = this.get_cell(x, y);
            let [_, _1, neighborhood_alives] = this.get_neighborhood(x, y);

            if (cell > 0) {
                if (neighborhood_alives < 2 || neighborhood_alives > 3) {
                    should_die.push([x, y, 0]);
                }
            }
            else {
                if (neighborhood_alives == 3) {
                    should_grow.push([x, y, 1]);
                }
            }
        }

        for (let [x, y, _] of should_die) {
            this.set_cell(x, y, 0);
        }

        for (let [x, y, _] of should_grow) {
            this.set_cell(x, y, 1);
        }

        this.steps += 1;

        if (this.steps % 100 == 0) {
            this.optimize();
        }
    }

    optimize() {
        for (let i=0; i < this.clusters.length; i++) {
            let cluster = this.clusters[i];
            cluster.count_alive_cells();

            if (cluster.cached_alive_cells_count <= 0) {
                this.clusters.splice(i, 1);
                i = 0;
            }
            else if (cluster.alive_cells_delta == 0) {
                cluster.paused = true;
            }
            else if (cluster.paused && cluster.alive_cells_delta != 0) {
                cluster.paused = false;
            }
        }
    }
}

let half_x = Math.round(canvas_element.width / 2);
let half_y = Math.round(canvas_element.height / 2);

let life = new Life();

let mouse_x = 0;
let mouse_y = 0;
let camera_x = 0;
let camera_y = 0;
let camera_zoom = 1;
let step_zoom = 1;
let dragging = false;
let begin_drag_x = 0;
let begin_drag_y = 0;
let dragging_x = 0;
let dragging_y = 0;

let mouse_down = false;

for (let i=0; i <= 50000; i++){
    life.set_cell((Math.round(Math.random() * 64) - 32), Math.round((Math.random() * 64) - 32), 1);
}

function draw_frame() {
    canvas_ctx.fillStyle = 'black';
    canvas_ctx.fillRect(-half_x, -half_y, half_x * 2, half_y * 2);

    for (let cluster of life.clusters) {
        canvas_ctx.strokeStyle = cluster.paused? 'grey' : 'yellow';
        canvas_ctx.strokeRect(dragging_x + camera_x + (cluster.x * (2 * camera_zoom)), dragging_y + camera_y + (cluster.y * (2 * camera_zoom)), cluster.width * (2 * camera_zoom), cluster.height * (2 * camera_zoom));
        // canvas_ctx.strokeText(`(${cluster.average_alive_cells_count}; D=${cluster.alive_cells_delta})`, dragging_x + camera_x + (cluster.x * (2 * camera_zoom)), dragging_y + camera_y + (cluster.y * (2 * camera_zoom)))
        let grid = cluster.grid;

        let color = cluster.paused ? 64 : 255;

        for (let y=0; y < grid.height; y++) {
            for (let x=0; x < grid.width; x++) {
                let cell = cluster.grid.get_item(x, y);

                if (cell > 0) {
                    canvas_ctx.fillStyle = `rgb(${color},${color},${color})`;
                    canvas_ctx.fillRect(dragging_x + camera_x + ((cluster.x + x) * (2 * camera_zoom)), dragging_y + camera_y + ((cluster.y + y) * (2 * camera_zoom)), (2 * camera_zoom), (2 * camera_zoom));
                }
            }
        }
    }

    life.step();

    life.set_cell((Math.round(Math.random() * 32) - 16), Math.round((Math.random() * 32) - 16), 1);

    return requestAnimationFrame(draw_frame);
}

draw_frame();



canvas_element.addEventListener('mousedown', e => {
    if (!dragging) {
        dragging = true;
        begin_drag_x = mouse_x;
        begin_drag_y = mouse_y;
        dragging_x = 0;
        dragging_y = 0;
    }
});

canvas_element.addEventListener('mouseup', e => {
    if (dragging) {
        dragging = false;
        camera_x += dragging_x;
        camera_y += dragging_y;
        dragging_x = 0;
        dragging_y = 0;
    }
});

canvas_element.addEventListener('mousemove', e => {
    mouse_x = e.x - half_x;
    mouse_y = e.y - half_y;

    if (dragging) {
        dragging_x = mouse_x - begin_drag_x;
        dragging_y = mouse_y - begin_drag_y;
    }
});

canvas_element.addEventListener('wheel', e => {
    step_zoom += e.deltaY * 0.001;

    if (step_zoom <= 0) {
        step_zoom = 0.01;
    }

    camera_zoom = step_zoom;
});