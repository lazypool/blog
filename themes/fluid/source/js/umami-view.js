// Get umami config from CONFIG
const website_id = CONFIG.web_analytics.umami.website_id;
// Build request URL
const request_url = `${CONFIG.web_analytics.umami.api_server}/websites/${website_id}/stats`;

const start_time = new Date(CONFIG.web_analytics.umami.start_time).getTime();
const end_time = new Date().getTime();
const token = CONFIG.web_analytics.umami.token;

// Validate config
if (!website_id) {
  throw new Error("Umami website_id is empty");
}
if (!request_url) {
  throw new Error("Umami request_url is empty");
}
if (!start_time) {
  throw new Error("Umami start_time is empty");
}
if (!token) {
  throw new Error("Umami token is empty");
}

// Build request params
const params = new URLSearchParams({
  startAt: start_time,
  endAt: end_time,
});
// Build request headers
const request_header = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "x-umami-api-key": "oZKCH3msvqt10VlXKwoJvHclmaS4bVx0",
  },
};

// Fetch site statistics
async function siteStats() {
  try {
    const response = await fetch(`${request_url}?${params}`, request_header);
    const data = await response.json();
    const uniqueVisitors = data.uniques.value; // Unique visitors
    const pageViews = data.pageviews.value; // Page views

    let pvCtn = document.querySelector("#umami-site-pv-container");
    if (pvCtn) {
      let ele = document.querySelector("#umami-site-pv");
      if (ele) {
        ele.textContent = pageViews; // Set page views
        pvCtn.style.display = "inline"; // Show element
      }
    }

    let uvCtn = document.querySelector("#umami-site-uv-container");
    if (uvCtn) {
      let ele = document.querySelector("#umami-site-uv");
      if (ele) {
        ele.textContent = uniqueVisitors;
        uvCtn.style.display = "inline";
      }
    }
  } catch (error) {
    console.error(error);
    return "-1";
  }
}

// Fetch page views
async function pageStats(path) {
  try {
    const response = await fetch(`${request_url}?${params}&url=${path}`, request_header);
    const data = await response.json();
    const pageViews = data.pageviews.value;

    let viewCtn = document.querySelector("#umami-page-views-container");
    if (viewCtn) {
      let ele = document.querySelector("#umami-page-views");
      if (ele) {
        ele.textContent = pageViews;
        viewCtn.style.display = "inline";
      }
    }
  } catch (error) {
    console.error(error);
    return "-1";
  }
}

siteStats();

// Get page view container
let viewCtn = document.querySelector("#umami-page-views-container");
// Fetch page views if container exists
if (viewCtn) {
  let path = window.location.pathname;
  let target = decodeURI(path.replace(/\/*(index.html)?$/, "/"));
  pageStats(target);
}
