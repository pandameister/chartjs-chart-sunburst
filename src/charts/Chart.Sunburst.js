export default Chart => {
  Chart.Sunburst = (context, config) => {
    config.type = 'sunburst';

    return new Chart(context, config);
  };
};
