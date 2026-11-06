-- VerseCast for OBS: adds the live scripture lower third / full-screen slide to the current scene.
-- Install: OBS > Tools > Scripts > + > pick this file. It starts VerseCast when OBS starts (can be turned off).
obs = obslua

local base_url = "http://localhost:8765"
local autostart = true

local SOURCES = {
  overlay = { name = "VerseCast Lower Third", path = "/output.html?overlay" },
  full    = { name = "VerseCast Slide",       path = "/output.html" },
}

function script_description()
  return [[<h2>VerseCast</h2>
<p>Live scripture on screen: VerseCast listens to the sermon, spots Bible references and quotes, and shows the verse.</p>
<p>VerseCast starts with OBS and closes when OBS closes (or click <b>Start VerseCast now</b>). Use the buttons below to add it to the current scene (the Preview scene in Studio Mode).</p>
<p><b>Control dock:</b> Docks &gt; Custom Browser Docks, name <b>VerseCast</b>, URL <b>http://localhost:8765/?dock</b></p>]]
end

function script_defaults(settings)
  obs.obs_data_set_default_string(settings, "url", base_url)
  obs.obs_data_set_default_bool(settings, "autostart", true)
end

function script_update(settings)
  base_url = obs.obs_data_get_string(settings, "url"):gsub("/+$", "")
  autostart = obs.obs_data_get_bool(settings, "autostart")
end

-- Runs Start VerseCast.bat from the folder above this script. Safe to repeat: VerseCast only ever opens one window.
function start_versecast()
  local folder = script_path():gsub("[/\\]obs[/\\]?$", ""):gsub("/", "\\")
  -- cmd /c so the launcher's console closes when it's done (a bare .bat would stay open as cmd /k)
  os.execute('start "" /min cmd /c "' .. folder .. '\\Start VerseCast.bat"')
end

-- Asks VerseCast to close its window and projector and stop (curl ships with Windows 10 and 11).
function stop_versecast()
  os.execute('curl -s -m 3 -X POST ' .. base_url .. '/quit')
end

function script_load(settings)
  if obs.obs_data_get_bool(settings, "autostart") then start_versecast() end
  -- SCRIPTING_SHUTDOWN: OBS unloads scripts before it sends EXIT, so EXIT alone never reaches us
  obs.obs_frontend_add_event_callback(function(event)
    if autostart and (event == obs.OBS_FRONTEND_EVENT_SCRIPTING_SHUTDOWN or event == obs.OBS_FRONTEND_EVENT_EXIT) then
      stop_versecast()
    end
  end)
end

function script_properties()
  local props = obs.obs_properties_create()
  obs.obs_properties_add_bool(props, "autostart", "Start VerseCast with OBS and close it when OBS closes")
  obs.obs_properties_add_button(props, "start_now", "Start VerseCast now", function() start_versecast() return true end)
  obs.obs_properties_add_text(props, "url", "VerseCast address", obs.OBS_TEXT_DEFAULT)
  obs.obs_properties_add_button(props, "add_overlay", "Add lower third to current scene", function() add_to_scene(SOURCES.overlay) return true end)
  obs.obs_properties_add_button(props, "add_full", "Add full-screen slide to current scene", function() add_to_scene(SOURCES.full) return true end)
  return props
end

-- Adds the browser source to the current scene (the Preview scene in Studio Mode, so nothing changes on air),
-- creating it the first time; reuses it if it already exists.
function add_to_scene(kind)
  local scene_source
  if obs.obs_frontend_preview_program_mode_active() then
    scene_source = obs.obs_frontend_get_current_preview_scene()
  else
    scene_source = obs.obs_frontend_get_current_scene()
  end
  if scene_source == nil then return end
  local scene = obs.obs_scene_from_source(scene_source)

  local source = obs.obs_get_source_by_name(kind.name)
  if source == nil then
    local video = obs.obs_video_info()
    obs.obs_get_video_info(video)
    local settings = obs.obs_data_create()
    obs.obs_data_set_string(settings, "url", base_url .. kind.path)
    obs.obs_data_set_int(settings, "width", video.base_width)
    obs.obs_data_set_int(settings, "height", video.base_height)
    source = obs.obs_source_create("browser_source", kind.name, settings, nil)
    obs.obs_data_release(settings)
  end

  if obs.obs_scene_find_source(scene, kind.name) == nil then
    obs.obs_scene_add(scene, source)
  end
  obs.obs_source_release(source)
  obs.obs_source_release(scene_source)
end
