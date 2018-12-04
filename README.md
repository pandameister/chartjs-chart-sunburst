# Chart.js Sunburst Chart

Chart.js sunburst chart implementation

<img src="https://pandameister.github.io/chartjs-chart-sunburst/docs/samples/sample.gif" alt="drawing" width="250"/>

See [Live Samples](https://pandameister.github.io/chartjs-chart-sunburst/docs/samples/index.html)

## Install

```bash
npm install --save chart.js chartjs-chart-sunburst
```

## Chart Type

The code will register one new chart type with chartjs: `sunburst`

## Usage

Using node:

```javascript
require('chart.js');
require('chartjs-chart-sunburst');
```

Or with a script tag

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.bundle.min.js"></script>

<script src="node_modules/chartjs-chart-sunburst/build/Chart.Sunburst.umd.min.js"></script>
```

and then use the `sunburst` chartType when create a Chart:

```javascript

var ctx = document.getElementById('chart-area').getContext('2d');
var config = {
    type: 'sunburst',
    options: {
      ...
    },
    ...
};
new Chart(ctx, config);
```

## Building

```sh
yarn install
yarn build
```
