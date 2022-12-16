{
const svg_dimensions = {
	height: 500,
	width: 1000,
	scale: 1.5,
};
const margin = {
	top: 25,
	middle: 25,
	bottom: 50,
	left: 75,
	right: 25,
};
const height_stacked_histogram = (svg_dimensions.height - (margin.top + margin.middle + margin.bottom)) * 0.8;
const height_histogram = svg_dimensions.height - (margin.top + margin.middle + margin.bottom) - height_stacked_histogram;
const width = svg_dimensions.width - margin.left - margin.right;

const data_path = "data/household.csv"

// Category along the x-axis
const horizontal_category = "TRCHILDNUM";
const horizontal_category_label = "Number of Children";

// Categories along the y-axis
const category_order = [
	"Caring for HH children",
	"Housework",
	"Grocery shopping",
];
const vertical_category_label = "Average minutes spent";

const stacked_histogram_colors = d3.schemeTableau10
const category_colors = stacked_histogram_colors.map(d => d3.hsl(d3.hsl(d).h, 1, 0.5));
const min_color_concentration = 0.05;
function get_color(proportion, category_id) {
	return d3.interpolateHsl(
		d3.hsl(category_colors[category_id].h, 1 - min_color_concentration, 1 - min_color_concentration),
		category_colors[category_id]
	)(proportion);
}
const histogram_color = d3.schemeTableau10[9];

// Probably want true here so that variances are easy to compare across x-axis
const subplots_use_same_x_scale = true;
// Probably want false here since the counts per bar might vary wildly
const subplots_use_same_y_scale = false;
// How many ticks the mini histograms should have. Let's just split by hours
const mini_ticks = Math.round(1440 / 60);
// Control whether the mini histograms have extra padding along the x-axis
const pad_mini_plots = false;

const svg = d3.select("#barbar_plot")
	.append("svg")
		.attr("height", svg_dimensions.height * svg_dimensions.scale)
		.attr("width", svg_dimensions.width * svg_dimensions.scale);
const svg_stacked_histogram = svg.append("g")
		.attr("transform",
		      "matrix(" + svg_dimensions.scale + " 0 "
		                + "0 " + svg_dimensions.scale + " "
		                + (svg_dimensions.scale * margin.left) + " "
		                + (svg_dimensions.scale * margin.top) + ")");
const svg_histogram = svg.append("g")
		.attr("transform",
		      "matrix(" + svg_dimensions.scale + " 0 "
		                + "0 " + svg_dimensions.scale + " "
		                + (svg_dimensions.scale * margin.left) + " "
		                + (svg_dimensions.scale * (margin.top + margin.middle + height_stacked_histogram)) + ")");

d3.csv(data_path, d => {
	row = {children: +d[horizontal_category]};
	for (category of category_order) {
		row[category] = +d[category];
	}
	return row;
}).then(function(data) {
	const most_children = d3.max(data, d => d.children);
	const least_children = d3.min(data, d => d.children);

	// x-axes
	const x = d3.scaleLinear()
		.domain([least_children - 0.5, most_children + 0.5])
		.range([0, width]);
	svg_stacked_histogram.append("g")
		.attr("transform", "translate(0," + height_stacked_histogram + ")")
		.call(d3.axisBottom(x).ticks(most_children - least_children + 1).tickFormat(d3.format("d")));
	svg_histogram.append("g")
		.attr("transform", "translate(0," + height_histogram + ")")
		.call(d3.axisBottom(x).ticks(most_children - least_children + 1).tickFormat(d3.format("d")));
	svg_histogram.append("text")
		.attr("x", width / 2)
		.attr("y", height_histogram + margin.bottom / 2)
		.attr("text-anchor", "middle")
		.attr("dominant-baseline", "middle")
		.text(horizontal_category_label);

	// data aggregation
	const bins = d3.histogram()
		.value(d => d.children)
		.domain(x.domain())
		.thresholds(Array.from({length: most_children - least_children + 1},
		                       (_, i) => least_children + i - 0.5))(data);
	const averaged_stacked_bins = bins.map((d, i, array) => {
		col = {};
		if (d.length == 0) {
			for (category of category_order) {
				col[category] = 0;
			}
		} else {
			for (category of category_order) {
				col[category] = d
					.reduce((sum, row) => sum + row[category], 0) / d.length;
			}
		}
		return col;
	});
	const averaged_bins = averaged_stacked_bins
		.map(d => category_order
			.map(category => d[category])
			.reduce((sum, val) => sum + val, 0));

	// y-axes
	const y_stacked_histogram = d3.scaleLinear()
		.domain([0, Math.ceil(d3.max(averaged_bins))])
		.range([height_stacked_histogram, 0]);
	svg_stacked_histogram.append("g")
		.call(d3.axisLeft(y_stacked_histogram));
	svg_stacked_histogram.append("text")
		.attr("x", -height_stacked_histogram / 2)
		.attr("y", -60)
		.attr("transform", "rotate(-90)")
		.attr("text-anchor", "middle")
		.attr("dominant-baseline", "middle")
		.text(vertical_category_label);
	const y_histogram = d3.scaleLinear()
		.domain([0, d3.max(bins, bin => bin.length)])
		.range([height_histogram, 0]);
	svg_histogram.append("g")
		.call(d3.axisLeft(y_histogram).ticks(5));
	svg_histogram.append("text")
		.attr("x", -height_histogram / 2)
		.attr("y", -60)
		.attr("transform", "rotate(-90)")
		.attr("text-anchor", "middle")
		.attr("dominant-baseline", "middle")
		.text("Count");

	// stacked bars
	// This aggregates averaged_stacked_bins so that d3 can plot it easily.
	const series = d3.stack()
		.keys(category_order)
		.order(d3.stackOrderNone)
		.offset(d3.stackOffsetNone)(averaged_stacked_bins);

	// Unfortunately, we need a bit more data than what series currently
	// contains. So, we augment it a bit.
	let max_stacked_bins;
	if (subplots_use_same_x_scale) {
		max_stacked_bins = Array.from({length: bins.length},
			() => d3.max(bins,
			             d => d3.max(category_order,
			                         category => d3.max(d,
			                                            row => row[category])))
		);
	} else {
		max_stacked_bins = bins.map(d => d3.max(category_order,
			category => d3.max(d, row => row[category])));
	}
	for (let i = 0; i < series.length; ++i) {
		let category = category_order[i];
		for (let j = 0; j < series[i].length; ++j) {
			// mini_width has to be increased very slightly due to the upper
			// bounds of the bins being exclusive
			let mini_width = max_stacked_bins[j] * 1.0001;
			let mini_domain;
			let mini_thresholds;
			if (pad_mini_plots) {
				mini_domain = [
					-mini_width / mini_ticks,
					mini_width + mini_width / mini_ticks
				];
				mini_thresholds = [...Array(mini_ticks + 1).keys()]
					.map(d => mini_width * d / mini_ticks);
			} else {
				mini_domain = [0, mini_width];
				mini_thresholds = [...Array(mini_ticks - 1).keys()]
					.map(d => mini_width * (d + 1) / mini_ticks);
			}

			let mini_bins = d3.histogram()
				.value(d => d[category])
				.domain(mini_domain)
				.thresholds(mini_thresholds)(bins[j]);
			series[i][j] = {
				category_id: i,
				mini_bins: mini_bins,
				mini_bins_domain: mini_domain,
				mini_y_range: series[i][j],
				mini_bin_max_length: d3.max(mini_bins, d => d.length),
			};
		}
	}

	// Figure out the largest count of a mini bin within a column (that is,
	// within one of the large bars in the histogram). This lets us use a
	// "sane" scaling strategy for the mini histograms per column.
	let max_count_mini_bins;
	if (subplots_use_same_y_scale) {
		max_count_mini_bins = Array.from({length: bins.length},
			() => d3.max(Array(bins.length).keys(),
			             j => d3.max(Array(category_order.length).keys(),
			                         i => series[i][j].mini_bin_max_length))
		);
	} else {
		max_count_mini_bins = [...Array(bins.length).keys()].map(
			j => d3.max(Array(category_order.length).keys(),
			            i => series[i][j].mini_bin_max_length)
		);
	}

	// Construct the stacked bar chart
	let svg_stacked_histogram_bars = svg_stacked_histogram.append("g")
		.selectAll("g")
		.data(series)
		.join("g");

	let svg_stacked_bars = svg_stacked_histogram_bars.selectAll("g")
		.data(d => d)
		.join("g");

	svg_stacked_bars.each(function(d, i) {
		let mini_x = d3.scaleLinear()
			.domain(d.mini_bins_domain)
			.range([x(bins[i].x0) + 2, x(bins[i].x1) - 1]);
		let mini_y_0 = y_stacked_histogram(d.mini_y_range[0]);
		let mini_y_1 = y_stacked_histogram(d.mini_y_range[1]);
		let mini_y = d3.scaleLinear()
			.domain([0, 1])
			.range([mini_y_0, mini_y_1 + 2]);

		// Mini histogram plots
		d3.select(this)
			.append("g")
			.selectAll("g")
			.data(d.mini_bins)
			.join("rect")
				.attr("x", (mini_d, mini_i) => mini_x(d.mini_bins[mini_i].x0))
				.attr("y", mini_d => mini_y(mini_d.length / Math.max(1, max_count_mini_bins[i]) / 1.1))
				.attr("width", (mini_d, mini_i) => mini_x(d.mini_bins[mini_i].x1) - mini_x(d.mini_bins[mini_i].x0))
				.attr("height", mini_d => mini_y_0 - mini_y(mini_d.length / Math.max(1, max_count_mini_bins[i]) / 1.1))
				.attr("fill", stacked_histogram_colors[d.category_id])
				.attr("stroke", "#000000")
				.attr("stroke-width", 1);

		// 1-d heat maps
		d3.select(this)
			.append("g")
			.lower()
			.selectAll("g")
			.data(d.mini_bins)
			.join("rect")
				.attr("x", (mini_d, i) => mini_x(d.mini_bins[i].x0))
				.attr("y", mini_d => mini_y_1 + 1)
				.attr("width", (mini_d, mini_i) => mini_x(d.mini_bins[mini_i].x1) - mini_x(d.mini_bins[mini_i].x0))
				.attr("height", mini_y_0 - mini_y_1 - 1)
				.attr("fill", mini_d => get_color(mini_d.length / d.mini_bin_max_length, d.category_id))
				.attr("stroke", mini_d => get_color(mini_d.length / d.mini_bin_max_length, d.category_id))
				.attr("stroke-width", 1);
	});

	// Borders of the stacked bars
	svg_stacked_bars.append("rect")
		.attr("x", (d, i) => x(bins[i].x0) + 1)
		.attr("y", d => y_stacked_histogram(d.mini_y_range[1]) + 1)
		.attr("width", (d, i) => x(bins[i].x1) - x(bins[i].x0) - 1)
		.attr("height", d => y_stacked_histogram(d.mini_y_range[0]) - y_stacked_histogram(d.mini_y_range[1]) - 1)
		.attr("fill-opacity", 0)
		.attr("stroke", "#cccccc")
		.attr("stroke-width", 1)
		.raise();

	// Construct the bin count histogram
	svg_histogram.append("g")
		.selectAll("rect")
		.data(bins)
		.join("rect")
			.attr("x", (d, i) => x(bins[i].x0) + 1)
			.attr("y", d => y_histogram(d.length) + 1)
			.attr("width", (d, i) => x(bins[i].x1) - x(bins[i].x0) - 1)
			.attr("height", d => y_histogram(0) - y_histogram(d.length) - 1)
			.attr("fill", histogram_color)
			.attr("stroke", "#cccccc")
			.attr("stroke-width", 1);
});
}
