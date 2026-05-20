import math
import wave
import struct
import numpy as np
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.scrollview import ScrollView
from kivy.uix.label import Label
from kivy.graphics import Color, RenderContext, Rectangle
from kivy.clock import Clock
from kivy.core.audio import SoundLoader

# --- ШЕЙДЕР ДЛЯ МЕДЛЕННОГО ГРАДИЕНТА ---
shader_code = '''
$Header
uniform vec2 resolution;
uniform float time;

void main(void) {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float r = 0.4 + 0.4 * sin(time * 0.05 + uv.x);
    float g = 0.3 + 0.4 * cos(time * 0.03 + uv.y);
    float b = 0.6 + 0.3 * sin(time * 0.04 + uv.x * uv.y);
    gl_FragColor = vec4(r, g, b, 1.0);
}
'''

class ShaderBackground(FloatLayout):
    def __init__(self, **kwargs):
        self.canvas = RenderContext()
        self.canvas.shader.fs = shader_code
        super().__init__(**kwargs)
        self.canvas['resolution'] = [float(x) for x in self.size]
        self.canvas['time'] = 0.0
        Clock.schedule_interval(self.update_shader, 1.0 / 60.0)
        self.bind(size=self.on_size)

    def update_shader(self, dt):
        self.canvas['time'] += dt

    def on_size(self, instance, value):
        self.canvas['resolution'] = [float(x) for x in value]

# --- ГЕНЕРАЦИЯ ЭМБИЕНТА ЧИСТЫМ WAVE + NUMPY ---
def generate_ambient_audio():
    sample_rate = 22050
    duration = 20.0  
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    
    wave_data = 0.3 * np.sin(2 * np.pi * 65.41 * t)   # C2
    wave_data += 0.25 * np.sin(2 * np.pi * 98.00 * t)  # G2
    wave_data += 0.2 * np.sin(2 * np.pi * 130.81 * t) # C3
    
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * t)
    final_wave = wave_data * mod
    final_wave = np.int16(final_wave / np.max(np.abs(final_wave)) * 32767)
    
    with wave.open('ambient.wav', 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(final_wave.tobytes())

# --- СТИЛЬ APPLE GLASS (ПРОЗРАЧНЫЕ КНОПКИ) ---
class GlassButton(Button):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.background_normal = ''
        self.background_color = [1, 1, 1, 0.15]
        self.font_size = '18sp'
        self.color = [1, 1, 1, 0.9]

class GlassInput(TextInput):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.background_normal = ''
        self.background_color = [1, 1, 1, 0.1]
        self.foreground_color = [1, 1, 1, 1]
        self.hint_text_color = [1, 1, 1, 0.4]
        self.padding = [10, 10, 10, 10]

class GlassNotesApp(App):
    def build(self):
        generate_ambient_audio()
        self.sound = SoundLoader.load('ambient.wav')
        if self.sound:
            self.sound.loop = True
            self.sound.play()

        root = ShaderBackground()
        main_layout = BoxLayout(orientation='vertical', padding=25, spacing=20)
        
        title = Label(text="Заметки", font_size='36sp', bold=True, size_hint_y=0.1, color=[1,1,1,0.95])
        main_layout.add_widget(title)
        
        self.input = GlassInput(hint_text="Новая заметка...", size_hint_y=0.12)
        main_layout.add_widget(self.input)
        
        btn = GlassButton(text="Добавить", size_hint_y=0.08)
        btn.bind(on_press=self.add_note)
        main_layout.add_widget(btn)
        
        self.scroll = ScrollView(size_hint_y=0.7)
        self.notes_box = BoxLayout(orientation='vertical', spacing=12, size_hint_y=None)
        self.notes_box.bind(minimum_height=self.notes_box.setter('height'))
        
        self.scroll.add_widget(self.notes_box)
        main_layout.add_widget(self.scroll)
        
        root.add_widget(main_layout)
        return root

    def add_note(self, instance):
        text = self.input.text.strip()
        if text:
            note_lbl = Label(text=text, size_hint_y=None, height=45, color=[1,1,1,0.95], font_size='16sp')
            self.notes_box.add_widget(note_lbl)
            self.input.text = ''

if __name__ == '__main__':
    GlassNotesApp().run()
