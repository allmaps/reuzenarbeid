/* global ol, fetch, annotation, transform, allmapsLayers, tileUrl */

let warpedMapLayer
let geojson

// let dragPanEnabled = true

async function fetchJSON (url) {
  const response = await fetch(url)
  const json = await response.json()
  return json
}

async function fetchImage (imageUri) {
  const json = await fetchJSON(`${imageUri}/info.json`)
  return json
}

const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: tileUrl
      })
    })
  ],
  view: new ol.View({
    enableRotation: false,
    center: ol.proj.fromLonLat([4.922, 52.362]),
    zoom: 7
  }),
  interactions: new ol.interaction.defaults({
    mouseWheelZoom: false,
    dragBox: false,
    dragPan: false
  })
})

loadGeoJSON()

async function loadGeoJSON () {
  geojson = await fetchJSON('projects.geojson')

  const vectorSource = new ol.source.Vector({
    features: new ol.format.GeoJSON().readFeatures(geojson, {
      featureProjection: 'EPSG:3857'
    })
  })

  const vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'rgb(166, 61, 46)',
        width: 5
      })
    })
  })

  vectorLayer.setZIndex(100)

  map.addLayer(vectorLayer)
}

async function loadAnnotation (annotationUrl, projectId) {
  const maps = annotation.parse(await fetchJSON(annotationUrl))
  const firstMap = maps[0]

  const imageUri = firstMap.image.uri
  const image = await fetchImage(imageUri)

  const options = {
    image,
    georeferencedMap: firstMap,
    source: new ol.source.Vector()
  }

  if (warpedMapLayer) {
    map.removeLayer(warpedMapLayer)
    warpedMapLayer.destroy()
  }

  warpedMapLayer = new allmapsLayers.WarpedMapLayer(options)
  map.addLayer(warpedMapLayer)

  const projectFeature = geojson.features
    .filter((feature) => feature.properties.id === projectId)[0]

  // const transformArgs = transform.createTransformer(firstMap.gcps)
  // const polygon = firstMap.pixelMask
  //   .map((point) => transform.toWorld(transformArgs, point))

  // const geoMask = {
  //   type: 'Polygon',
  //   coordinates: [polygon]
  // }

  // const extent = ol.proj.transformExtent(new ol.source.Vector({
  //   features: new ol.format.GeoJSON().readFeatures(geoMask)
  // }).getExtent(), 'EPSG:4326', 'EPSG:3857')

  // const view = map.getView()
  // const resolution = view.getResolutionForExtent(extent)
  // const zoom = view.getZoomForResolution(resolution)
  // const center = ol.extent.getCenter(extent)

  if (projectFeature) {
    const view = map.getView()

    const extent = ol.proj.transformExtent(new ol.source.Vector({
      features: new ol.format.GeoJSON().readFeatures(projectFeature.geometry)
    }).getExtent(), 'EPSG:4326', 'EPSG:3857')

    const resolution = view.getResolutionForExtent(extent)
    const zoom = view.getZoomForResolution(resolution)
    const center = ol.extent.getCenter(extent)

    view.animate({
      center,
      zoom: zoom - 0.1,
      duration: 4000
    })
  }
}

window.addEventListener('project-focus', (event) => {
  const annotationId = event.detail.annotationId
  const projectId = event.detail.projectId

  if (annotationId && projectId) {
    const annotationUrl = `https://annotations.allmaps.org/images/${annotationId}`
    loadAnnotation(annotationUrl, projectId)
  }
})

// function disableDragPan () {
//   dragPanEnabled = false
// }

if ('ontouchstart' in window) {
  // disableDragPan()
  // map.addControl(panControl, 'bottom-right')
}