const Seoul = "Data/Clean/Seoul_dong.geojson"
const local_people = "Data/Clean/local_people_dong.csv"

let globalGeoData, globalPropData;

let selectedDong = '합정동';
let selectedHour = 10;
let selectedAge = '30';

let isInitial = true;

const width = 1060;
const height = 800;


const w_m = 460
const h_m = 460 

const svg = d3.select("#viz").append("svg")
    .attr("width", width)
    .attr("height", height);  

const mapLayer = svg.append("g").attr("id", "map")
  .attr("width", w_m)
  .attr("height", h_m)
  .attr("transform", `translate(10, 30)`)

const pyramidLayer = svg.append("g").attr("id", "pyramid")
  .attr("transform", `translate(660, 200)`)

const heatmapLayer = svg.append("g").attr("id", "heatmap")
  .attr("transform", `translate(660, 455)`)

// const sliderLayer = svg.append("foreignObject")
//   .attr("x", 675)
//   .attr("y", 555)
//   .attr("width", 375) 
//   .attr("height", 40);  

const projection = d3.geoMercator()
  .center([126.9780, 37.5665]) // Center on Seoul 
  .scale(80000) // Adjust scale as needed 
  .translate([width/4 + 10 , height / 2 -20]); // Center the map in the SVG

const path = d3.geoPath().projection(projection);

svg.append("text")
  .attr("x", 35)
  .attr("y", 80)
  .attr("text-anchor", "left")
  .attr("font-size", "30px")  
  .text("Seoul's Living Population")


svg.append("text")
  .attr("x", 860)
  .attr("y", 720)
  .attr("text-anchor", "left")
  .attr("fill", "#333")
  .attr("font-size", "10px")  
  .text("resource : https://story.pxd.co.kr/1408")


const infoPanel = svg.append("g")
  .attr("id", "info-panel") 
  .attr("transform", `translate(660, 105)`);

let infoDong = infoPanel.append("text")
  .attr("x", 0)
  .attr("y", 20)
  .attr("font-size", 20)
  .attr("fill", "#444")
  .text("");

let infoTime = infoPanel.append("text")
  .attr("x", 0)
  .attr("y", 48)
  .attr("font-size", 20)
  .attr("text-anchor", "right")
  .attr("fill", "#777")
  .text("");


let infoValue = infoPanel.append("text")
  .attr("x", 250)
  .attr("y", 43)
  .attr("font-size", 25)
  .attr("fill", "#aaa")
  .text("");

Promise.all([
  d3.json(Seoul),
  d3.csv(local_people)]
).then(([seoulData, localPeopleData]) => {

  globalGeoData = seoulData;
  globalPropData = localPeopleData;

  dataMap(globalGeoData);
  drawMap(globalPropData);
  drawPyramid();
  drawHeatmap();
  // drawSlider(localPeopleData);
  drawSelectAge();

  updateDashboard();
})



function updateInfoPanel(popMap){

  const value = popMap[selectedDong] ?? null;

  infoDong.text(selectedDong || "");

  infoTime.text(
    selectedHour != null ? `⏰ ${selectedHour}` : ""
  );

  infoValue.text(
    value != null ? value.toLocaleString() : ""
  );
}


function updateDashboard(){
  console.log("DASHBOARD UPDATE");
  console.log("selectedDong =", selectedDong);  
  console.log("selectedHour =", selectedHour);
  console.log("selectedAge =", selectedAge);

  updateMap();
  updatePyramid();
  updateHeatmap();

  updateInfoPanel(popMap);  
}

let sliderScale = null

function drawCustomSlider(){
  const sliderX = 663;
  const sliderY = 660;
  const sliderWidth = 360;

  sliderScale = d3.scaleLinear()
    .domain([0, 23])
    .range([0, sliderWidth])

  const sliderG = svg.append("g")
    .attr("class", "slider-values")
    .attr("transform", `translate(${sliderX}, ${sliderY})`);  
    
  const tickValues = [0, 3, 6, 9, 12, 15, 18, 21, 23];

  sliderG.selectAll(".tick-label")
    .data(tickValues)
    .enter()
    .append("text")
    .attr("x", d => sliderScale(d))
    .attr("y", 1)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", "#666")
    .text(d => d);

    sliderG.selectAll(".tick-line")
    .data(d3.range(24))
    .enter()
    .append("line")
    .attr("x1", d => sliderScale(d))
    .attr("x2", d => sliderScale(d))
    .attr("y1", 5)
    .attr("y2", 12)
    .attr("stroke", "#ccc");

// 4. 진짜 슬라이더(HTML) 넣기
    const sliderFO = svg.append("foreignObject")
        .attr("x", sliderX - 5) // 손잡이 위치 때문에 약간 보정
        .attr("y", sliderY + 8) // 눈금 아래에 배치
        .attr("width", sliderWidth + 10)
        .attr("height", 40);

    sliderFO.append("xhtml:div")
        .html(`
            <input type="range" id="time-slider" min="0" max="23" value="10" 
                  style="width: 100%; cursor: pointer; accent-color: transparent;">
        `);

    // 5. 이벤트 연결
    d3.select("#time-slider").on("input", function() {
        selectedHour = +this.value;
        d3.select("#hour-label").text(selectedHour);
        isInitial = false;
        updateDashboard();
    });
}



function dataMap(){
  let d = globalPropData

  if (isInitial){
    return Object.fromEntries(
      d3.rollup(
        d,
        v => d3.mean(v, x => +x.TOTAL),
        x => x.ADM_NM
      )
    )
  }

  
  hasHour = !!selectedHour;
  hasAge = !!selectedAge;

  if (hasHour || hasAge){
    if (hasHour) 
      d = d.filter(d => +d.TIME === +selectedHour);
    if (hasAge)
      d = d.filter(d => d.AGE === selectedAge); 

    return Object.fromEntries(
      d3.rollup(
        d,
        v => d3.mean(v, x => +x.population),
        x => x.ADM_NM
      )
    )
  }
}

let popMap = null;
let colorMap = null;

const legend = svg.append("g")
  .attr("id", "map-legend")
  .attr("transform", "translate(25, 170)");


function drawMap(){ 
  popMap = dataMap();

  colorMap = d3.scaleSequential()
    .domain(d3.extent(Object.values(popMap)))
    .interpolator(t => d3.interpolateRdYlBu(1-t));  

  mapLayer.selectAll("path")
    .data(globalGeoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .attr("fill", d=> colorMap(popMap[d.properties.ADM_NM] || 0))
    .on("click", (event, d) => {

      mapLayer.selectAll("path")
      .attr("stroke", "white")
      .attr("stroke-width", 0.5);
      
      selectedDong = d.properties.ADM_NM;
      
      d3.select(event.currentTarget)
        .raise()
        .attr("stroke", "black")
        .attr("stroke-width", 2.5)
      console.log("Selected Dong:", d.properties.TOTAL);
      updateDashboard();
    })

    
    const legendScale = d3.scaleLinear()
    .domain(colorMap.domain())
    .range([120, 0]);

  
    const legendAxis = d3.axisRight(legendScale)
      .ticks(5)
      .tickFormat(d => d);

    legend.selectAll("rect")
      .data(d3.range(0, 1, 0.02))
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", d => legendScale(
        d3.interpolate(...colorMap.domain())(d)
      ))
      .attr("width", 14)
      .attr("height", 5)
      .attr("fill", d => colorMap(
        d3.interpolate(...colorMap.domain())(d)
      ));

  legend.append("g")
    .attr("transform", "translate(18,0)")
    .call(legendAxis);
    
  console.log()
}

function updateMap(){

  popMap = dataMap();

  colorMap = d3.scaleSequential()
    .domain(d3.extent(Object.values(popMap)))
    .interpolator(t => d3.interpolateRdYlBu(1-t)); 

  mapLayer.selectAll("path")
    .attr("fill", d=> colorMap(popMap[d.properties.ADM_NM] || 0))
   
  console.log("map data", dataMap?.());
}


function dataPyramid(){
  const d = globalPropData  
      .filter(d =>
      (!selectedDong || d.ADM_NM === selectedDong)
      && (!selectedHour || +d.TIME === selectedHour));

  const data = d3.rollup(
    d,
    v => d3.sum(v, x => +x.population),
    d => d.AGE,
    d => d.GENDER
  )

  const result = []
  data.forEach((genders, age) =>{
    genders.forEach((pop, gender) => {
      result.push({
        age: age,
        gender: gender,
        value: gender === "M" ? -pop :pop
      })
    })
})
  return result.sort((a, b) => d3.ascending(a.age, b.age));
}

let PyramidX = null;
let PyramidY = null;

function drawPyramid(){

    const w = 370
    const h = 190

    PyramidX = d3.scaleBand()
      .range([0, w])  
      .padding(0.1);

    PyramidY = d3.scaleLinear()
      .range([h, 0])
      
    pyramidLayer.append("g")
      .attr("class", "x-axis")

    pyramidLayer.append("g")
      .attr("class", "y-axis")
    updatePyramid();

}

function updatePyramid(){

  const data = dataPyramid();
  console.log("pyramid data = ", data);

  const ages = [...new Set(data.map(d => d.age))].sort(d3.ascending);
  PyramidX.domain(ages);

  const maxAbs = d3.max(data, d => Math.abs(d.value));
  PyramidY.domain([-maxAbs, maxAbs]);

  const zeroY = PyramidY(0);
  const bars = pyramidLayer.selectAll(".pyramid-bar")
      .data(data, d => `${d.age}-${d.gender}`)
  
  const enter = bars.enter()
      .append("rect")
      .attr("class", "pyramid-bar") 
      .attr("fill", d =>d.gender === "M" ? "rgb(155, 208, 241, 0.6)" : "rgb(243, 189, 221, 0.6)")
      .attr("stroke", d =>d.gender === "M" ? "rgb(155, 208, 241)" : "rgb(243, 189, 221)")
      .attr("stroke-width", 1.5)
      .attr("x", d => PyramidX(d.age))
      .attr("width", PyramidX.bandwidth())
      .attr("y", zeroY) 
      .attr("height", 0);

      enter.merge(bars)
    .transition()
    .duration(500)
    .attr("y", d => 
      d.value > 0
      ? PyramidY(d.value)
      : zeroY
    )
    .attr("height", d =>
      Math.abs(PyramidY(d.value) - zeroY)

    );
  
  bars.exit().remove();


  pyramidLayer.select(".y-axis")
    .call(d3.axisLeft(PyramidY).ticks(5)
      .tickFormat(d => Math.abs(d)));
      
    }

    function drawSelectAge(){
      const selectorX = 663;
      const selectorY = 260;
      const sliderWidth = 360;
    
      const ageList = ["10", "15", "20", "25", "30",
        "35","40","45","50","55","60","65","70"];
    
    
      const selectorA = svg.append("g")
        .raise()
        .attr("class", "selector-ages")
        .attr("transform", `translate(${selectorX}, ${selectorY})`);  
      
      const buttons = selectorA.selectAll("g.age-btn")
        .data(ageList)
        .enter()
        .append("g")
        .attr("class", "age-btn") 
        .attr("transform", (d, i) => `translate(${i * 28.5}, 135)`)
        .style("cursor", "pointer")
        .on("click", (_, age) => handleAgeClick(age));  
      
      buttons.append("rect")
        .attr("width", 24)
        .attr("height", 20)
        .attr("rx", 4)
        .attr("stroke", "#999")
        .attr("fill", "white");
    
      buttons.append("text")
        .attr("class", "age-label")
        .attr("x", 12)
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .attr("font-weight", "normal")
        .attr("font-size", 10)
        .attr("fill", "#555")
        .text(d => d);
    }
    
    function handleAgeClick(age){
    
      selectedAge = age;
      isInitial = false;
    
      // 버튼 스타일 업데이트
      d3.selectAll(".age-btn rect")
        .attr("fill", "white")
        .attr("stroke", "#999");

      d3.selectAll(".age-label")
        .attr("font-weight", "normal")
        .attr("fill", "#555");
    
      d3.selectAll(".age-btn")
        .filter(d => d === age)
        .select("rect")
        .attr("stroke", "rgb(4, 28, 52)");

      d3.selectAll(".age-label")
        .filter(d => d === age)
        .attr("font-weight", "bold")
        .attr("fill", "rgb(4, 28, 52)");
    
      updateDashboard();
    }


function dataHeatmap(){
  let d = globalPropData;

  if (selectedDong){
    d = d.filter(d => d.ADM_NM === selectedDong);
  }

  const data = d3.rollup(
    d,
    v => d3.mean(v, x => +x.population),
    x => x.AGE,
    x => +x.TIME
  );

  const results = [];

  data.forEach((times, age) => {
    times.forEach((pop, time) => {
      results.push({
        age:age,
        time: time,
        value:pop
      })
    })
})

return results.sort((a, b) =>d3.ascending(a.age, b.age) || d3.ascending(a.time, b.time));
}


let heatX = null;
let heatY = null;
let heatColor = null;

function drawHeatmap(){

  const w = 370
  const h = 190
  const cell = 20;

  const data = dataHeatmap();

  const ages = [...new Set(data.map(d => d.age))]
  const times = [...new Set(data.map(d => d.time))]

  heatX = d3.scaleBand()
    .domain(times)
    .range([0, w])
    .padding(0.1);

  heatY = d3.scaleBand()
    .domain(ages)
    .range([0, h])
    .padding(0.1); 

  heatColor = d3.scaleSequential()
    .domain(d3.extent(data, d => d.value))
    .interpolator(d3.interpolateYlGnBu);  

  heatmapLayer.append("g")
    .attr("class", "heat-cells")

  heatmapLayer.append("g")
    .attr("class", "x-axis")  

  heatmapLayer.append("g")  
    .attr("class", "y-axis")  

  updateHeatmap();

  d3.select("#time-slider")
    .on("input", function () {
      isInitial = false;
      selectedHour = +this.value;
      d3.select("#hour-label").text(selectedHour);
      updateDashboard()
})

  drawCustomSlider()

}

function updateHeatmap(){
  const data = dataHeatmap();

  const h = 190

  const ages = [...new Set(data.map(d => d.age))]
  const times = [...new Set(data.map(d => d.time))]

  heatColor = d3.scaleSequential()
    .domain(d3.extent(data, d => d.value))
    .interpolator(d3.interpolateYlGnBu);

  heatX.domain(times)
  heatY.domain(ages)

  const cells = heatmapLayer
    .select(".heat-cells")
    .selectAll("rect")
    .data(data, d => `${d.age}-${d.time}`);

  cells.join(
    enter => enter.append("rect")
      .attr("x", d => heatX(d.time))
      .attr("y", d =>heatY(d.age))
      .attr("width", heatX.bandwidth())
      .attr("height", heatY.bandwidth())
      .attr("fill", d => heatColor(d.value))
      .attr("rx", 2),

    update => update
      .attr("fill", d => heatColor(d.value)),
  
    exit => exit.remove()
  )

  heatmapLayer.selectAll(".hour-highlight").remove();
  heatmapLayer.selectAll(".time-highlight").remove();

  if (selectedHour != null){
    heatmapLayer.append("rect")
      .attr("class","hour-highlight")
      .attr("x", heatX(selectedHour))
      .attr("y", 0)
      .attr("width", heatX.bandwidth())
      .attr("height", heatY.range()[1])
      .attr("fill","none")
      .attr("stroke","rgb(155, 233, 0)")
      .attr("stroke-width",3);
  }

  // if (selectedAge != null){
  //   heatmapLayer.append("rect")
  //     .attr("class","age-highlight")
  //     .attr("x", 0)
  //     .attr("y", heatY(selectedAge))
  //     .attr("width", 370)
  //     .attr("height", heatX.bandwidth())
  //     .attr("fill","none")
  //     .attr("stroke","rgb(90, 123, 24)")
  //     .attr("stroke-width",3);
  // }
  

  heatmapLayer.select(".y-axis")
    .call(d3.axisLeft(heatY)
      .tickValues(heatY.domain().filter(t => t % 10 === 0)))
    .attr("stroke-width", 0);
};


