# Requirements
* Python
* A web browser with graphical capabilities

# Execution
To run, first execute
```
python -m http.server -d path/to/this/directory
```
in a shell. Then access the address `http://127.0.0.1:8000/` from your web browser. After a couple of seconds, the visualization should generate and appear on screen as an embedded SVG image. To stop running, press `Ctrl-C` (or `Cmd+C` on Mac) to stop the Python HTTP server.

# Description of Files
* `barbar.js`: This is our implementation using D3.js.
* `index.html`: This is a bare bones webpage that the SVG image gets embedded into.
* `data/`: This is a set of various `.csv` files that serve as good examples for output. Notably, `household.csv` file is what was used in our report. `working.csv` is an example of what can go wrong (very small bars).
* `out/`: This is the output after running the various files in `data/` through our implementation.
* `d3.js`: This is a copy of the [D3.js](https://d3js.org/) library.
* `favicon.ico`: This is just the webpage's icon (included so that no warnings are printed to the console).
