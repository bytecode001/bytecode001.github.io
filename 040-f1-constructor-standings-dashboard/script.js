// --- Official HEX color mapping for F1 constructors (expandable) ---
const TEAM_COLORS = {
  "Red Bull":        "#1e41ff",
  "Red Bull Racing": "#1e41ff",
  "Ferrari":         "#dc0000",
  "Mercedes":        "#6cd3bf",
  "McLaren":         "#ff8700",
  "Aston Martin":    "#229971",
  "Alpine":          "#2293d1",
  "Alpine F1 Team":  "#2293d1",
  "Williams":        "#005aff",
  "RB F1 Team":      "#3f27c1",
  "AlphaTauri":      "#2b4562",
  "Toro Rosso":      "#0032a0",
  "Sauber":          "#52e4c2",
  "Alfa Romeo":      "#900000",
  "Haas F1 Team":    "#b6babd",
  "Racing Point":    "#e5c8d2",
  "Force India":     "#f596c8",
  "Lotus":           "#145a32",
  "Lotus F1":        "#145a32",
  "Renault":         "#ffd800",
  "Benetton":        "#00b950",
  "Minardi":         "#1a1a1a",
  "Super Aguri":     "#e30613",
  "Jaguar":          "#007a3d",
  "Toyota":          "#eb0a1e",
  "Manor Marussia":  "#c3002f",
  "Marussia":        "#c3002f",
  "Caterham":        "#005f3c",
  "HRT":             "#f7d117",
  "Virgin":          "#e20613",
  "Brawn":           "#fff600",
  "BMW Sauber":      "#0057b8",
  "BMW":             "#0057b8",
  "Jordan":          "#ffd700",
  "BAR":             "#d50032",
  "Prost":           "#003399",
  "Stewart":         "#0055a4",
  "Arrows":          "#ff7f00",
  "Ligier":          "#1976d2",
  "Footwork":        "#ff003c",
  "Osella":          "#004466",
  "Zakspeed":        "#e70c27",
  "Shadow":          "#343434",
  "Surtees":         "#0033cc",
  "Matra":           "#1976d2",
  "Tyrrell":         "#1e88e5",
  "March":           "#a7d5eb",
  "Brabham":         "#1c1c1c",
  "BRM":             "#00693e",
  "Cooper":          "#004225",
  "Vanwall":         "#367047",
  "Honda":           "#e50012",
  "Porsche":         "#c0c0c0"
};

// --- Fallback palette HEX for rare/unknown teams (never duplicates official) ---
const PALETTE = [
  "#ff9900", "#a259c2", "#f06292", "#4dd0e1", "#8bc34a", "#ffe600", "#8d5524", "#e17055",
  "#1abc9c", "#2ecc71", "#f1c40f", "#34495e", "#9b59b6", "#c0392b", "#2980b9", "#d35400"
];

// Assign unique color to each team (official first, then palette)
function assignColorsToTeams(teamNames) {
  let mapping = {};
  let usedColors = new Set();
  let paletteIdx = 0;

  teamNames.forEach(team => {
    if (TEAM_COLORS[team]) {
      mapping[team] = TEAM_COLORS[team];
      usedColors.add(TEAM_COLORS[team]);
    }
  });
  teamNames.forEach(team => {
    if (!mapping[team]) {
      while (usedColors.has(PALETTE[paletteIdx]) && paletteIdx < PALETTE.length) paletteIdx++;
      mapping[team] = PALETTE[paletteIdx] || "#888888";
      usedColors.add(mapping[team]);
      paletteIdx++;
    }
  });
  return mapping;
}

// --- Load CSVs and initialize dashboard ---
Promise.all([
  d3.csv('data/seasons.csv'),
  d3.csv('data/races.csv'),
  d3.csv('data/constructors.csv'),
  d3.csv('data/constructor_standings.csv')
]).then(function([seasons, races, constructors, standings]) {
  const select = d3.select("#seasonSelect");
  const years = seasons.map(d => d.year).sort((a, b) => +b - +a);
  select.selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);
  renderDashboard(years[0], races, constructors, standings);

  select.on("change", function() {
    renderDashboard(this.value, races, constructors, standings);
  });
});

// --- Main rendering for selected season ---
function renderDashboard(season, races, constructors, standings) {
  const seasonRaces = races.filter(r => r.year === season)
    .sort((a, b) => +a.round - +b.round);
  const raceIds = seasonRaces.map(r => r.raceId);
  const seasonStandings = standings.filter(s => raceIds.includes(s.raceId));
  const constructorMap = {};
  constructors.forEach(c => { constructorMap[c.constructorId] = c.name; });

  // List all teams present for this season
  let teamsSet = new Set();
  seasonStandings.forEach(s => teamsSet.add(constructorMap[s.constructorId] || s.constructorId));
  const teamNames = Array.from(teamsSet);

  // Assign colors
  const teamColors = assignColorsToTeams(teamNames);

  // Build data structure: {team: [{round, points}]}
  const teamData = {};
  seasonStandings.forEach(s => {
    const team = constructorMap[s.constructorId] || s.constructorId;
    if (!teamData[team]) teamData[team] = [];
    teamData[team].push({
      raceId: s.raceId,
      round: seasonRaces.find(r => r.raceId === s.raceId)?.round || 0,
      points: +s.points
    });
  });

  // For each team, make sure we have data for every race in order, using the "points" as is (they are already cumulative)
  Object.keys(teamData).forEach(team => {
    teamData[team] = seasonRaces.map(race => {
      const data = teamData[team].find(d => d.raceId === race.raceId);
      return { round: +race.round, points: data ? data.points : 0 };
    });
    teamData[team].sort((a, b) => a.round - b.round);
  });

  drawLineChart(teamData, seasonRaces, season, teamColors);
  drawSummaryTable(teamData, teamColors);
}

// --- Draw summary table with color badge, slight highlight animation on hover ---
function drawSummaryTable(teamData, teamColors) {
  const summary = [];
  Object.keys(teamData).forEach(team => {
    const lastRace = teamData[team][teamData[team].length-1];
    summary.push({ team, points: lastRace ? lastRace.points : 0 });
  });
  summary.sort((a, b) => b.points - a.points);
  summary.forEach((d, i) => d.position = i + 1);

  let tableHTML = `<table>
    <tr><th>Pos</th><th>Team</th><th>Points</th></tr>`;
  summary.forEach(row => {
    tableHTML += `<tr>
      <td>${row.position}</td>
      <td><span class="team-badge" style="background:${teamColors[row.team]}"></span> ${row.team}</td>
      <td>${row.points}</td>
    </tr>`;
  });
  tableHTML += `</table>`;
  d3.select("#summaryTable").html(tableHTML);
}

// --- D3.js animated, fully responsive line chart ---
function drawLineChart(teamData, races, season, teamColors) {
  d3.select("#chart").html(""); // reset

  // Responsive: use a fixed viewBox and scale to width 100%
  const margin = { top: 28, right: 24, bottom: 40, left: 58 },
        chartWidth = 820,
        chartHeight = 380,
        width = chartWidth - margin.left - margin.right,
        height = chartHeight - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .style("width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X axis: race round number
  const x = d3.scaleLinear()
    .domain([1, races.length])
    .range([0, width]);

  // Y axis: max cumulative points
  const maxPoints = d3.max(Object.values(teamData).flat(), d => d.points);
  const y = d3.scaleLinear()
    .domain([0, maxPoints*1.08])
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(races.length).tickFormat(d => "R" + d))
    .selectAll("text").attr("font-size", "12px");

  svg.append("g").call(d3.axisLeft(y).ticks(8));

  // Chart title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "1.5rem")
    .style("fill", "#ffda00")
    .text(`Constructor Standings • Season ${season}`);

  // Tooltip for points
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart-tooltip")
    .style("opacity", 0);

  // --- Animation: draw lines and dots with transition ---
  Object.keys(teamData).forEach((team, idx) => {
    const color = teamColors[team];
    const points = teamData[team];

    const line = d3.line()
      .x((d, i) => x(d.round))
      .y(d => y(d.points))
      .curve(d3.curveMonotoneX);

    // Add animated line
    const path = svg.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 3)
      .attr("opacity", 0.88)
      .attr("d", line);

    // Animate line drawing
    const length = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", length + " " + length)
      .attr("stroke-dashoffset", length)
      .transition()
      .duration(1200)
      .delay(idx * 120)
      .ease(d3.easeCubic)
      .attr("stroke-dashoffset", 0);

    // Animated dots
    svg.selectAll(`.dot-${team.replace(/\s/g, "")}`)
      .data(points)
      .enter()
      .append("circle")
      .attr("class", `dot dot-${team.replace(/\s/g, "")}`)
      .attr("cx", d => x(d.round))
      .attr("cy", d => y(0))
      .attr("r", 5)
      .attr("fill", color)
      .attr("opacity", 0)
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(120).style("opacity", 1);
        tooltip.html(`<strong>${team}</strong><br>Round: ${d.round}<br>Points: ${d.points}`)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
      })
      // Animate appearance and upward movement
      .transition()
      .duration(600)
      .delay((d, i) => 100 + i * 30 + idx * 100)
      .attr("cy", d => y(d.points))
      .attr("opacity", 1);
  });
}
