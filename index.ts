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

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.cached_alive_cells_count = 0;
        this.grid = new Grid(width, height);
    }

    coords_inside(x: number, y: number) : boolean {
        return ((x >= this.x) && (x < (this.x + this.width))) && ((y >= this.y) && (y < (this.y + this.height)));
    }

    count_alive_cells() : number {
        let alive_cells = 0;
        
        for (let cell of this.grid.cells) {
            if (cell > 0) {
                alive_cells++;
            }
        }

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
                cluster.set_cell(x, y, value);
                return;
            }
        }
        
        let new_cluster = new CellCluster(Math.floor((x / 64)) * 64, (Math.floor(y / 64) * 64), 64, 64);

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

        if (this.steps % 50 == 0) {
            for (let i=0; i < this.clusters.length; i++) {
                let cluster = this.clusters[i];

                if (cluster.count_alive_cells() < 1) {
                    this.clusters.splice(i, 1);
                    i = 0;
                }
            }
        }
    }
}

let half_x = Math.round(canvas_element.width / 2);
let half_y = Math.round(canvas_element.height / 2);

let life = new Life();

let mouse_x = 0;
let mouse_y = 0;
let begin_drag_x = 0;
let begin_drag_y = 0;

let camera_x = 0;
let camera_y = 0;

let mouse_down = false;

for (let i=0; i <= 50000; i++){
    life.set_cell((Math.round(Math.random() * 64) - 32), Math.round((Math.random() * 64) - 32), 1);
}

function draw_frame() {
    canvas_ctx.fillStyle = 'black';
    canvas_ctx.fillRect(-half_x, -half_y, half_x * 2, half_y * 2);

    

    for (let cluster of life.clusters) {
        
        canvas_ctx.strokeStyle = 'yellow';
        canvas_ctx.strokeRect(camera_x + (cluster.x * 2), camera_y + (cluster.y * 2), cluster.width * 2, cluster.height *2);

        let grid = cluster.grid;

        for (let y=0; y < grid.height; y++) {
            for (let x=0; x < grid.width; x++) {
                let cell = cluster.grid.get_item(x, y);
                let color = 128 + (Math.round(cell * 1000) % 127);
    
                if (cell > 0) {
                    canvas_ctx.fillStyle = `rgb(${color},${color},${color})`;
                    canvas_ctx.fillRect(camera_x + ((cluster.x + x) * 2), camera_y + ((cluster.y + y) * 2), 2, 2);
                }
            }
        }
    }

    life.step();

    return requestAnimationFrame(draw_frame);
}

draw_frame();

canvas_element.addEventListener('mousemove', e => {
    mouse_x = e.x;
    mouse_y = e.y;
    camera_x = mouse_x;
    camera_y = mouse_y;
});