"""Deterministic original painted surfaces and baked multilingual signage (Pillow)."""
from PIL import Image, ImageDraw, ImageFont
import random, pathlib, tempfile, urllib.request, hashlib
cache=pathlib.Path(tempfile.gettempdir())/'tuktuk-art-fonts';cache.mkdir(exist_ok=True)
for family,expected in [('NotoSansThai','5a1c559bb539583c8a1fd99d1c5b9491e5e14478c9cd2bd0970d5c3096cc9ef8'),('NotoSansSC','a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da')]:
 file=cache/(family+'.ttf')
 if not file.exists():
  filename=family+('%5Bwdth,wght%5D.ttf' if family=='NotoSansThai' else '%5Bwght%5D.ttf')
  url='https://raw.githubusercontent.com/google/fonts/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/'+family.lower()+'/'+filename
  urllib.request.urlretrieve(url,file)
 assert hashlib.sha256(file.read_bytes()).hexdigest()==expected, 'Font source checksum changed'

root=pathlib.Path(__file__).resolve().parents[1]/'public/assets/textures'
r=random.Random(441)
for name,base in [('asphalt',(70,76,80)),('plaster',(232,224,203)),('paving',(160,150,132))]:
 im=Image.new('RGB',(256,256));p=im.load()
 for y in range(256):
  for x in range(256):
   n=r.randint(-11,11);p[x,y]=tuple(max(0,min(255,v+n)) for v in base)
 d=ImageDraw.Draw(im)
 if name=='plaster':
  for i in range(90):
   x=r.randrange(256);y=r.randrange(256);d.line([(x,y),(x+r.randrange(-10,10),y+r.randrange(4,24))],fill=(200,193,171),width=1)
 if name=='paving':
  for y in range(0,256,32):
   d.line([(0,y),(256,y)],fill=(96,99,95),width=2)
   for x in range(-32,256,64):d.line([(x+(32 if y%64 else 0),y),(x+(32 if y%64 else 0),y+32)],fill=(100,105,98),width=2)
 im.save(root/f'{name}.png')
# Each 512x256 tile is a whole sign; no browser/platform font fallback.
signs=[('เยาวราช','耀華力','YAOWARAT'),('ร้านทอง','金行','GOLD'),('ก๋วยเตี๋ยว','麵家','NOODLES'),('กาแฟ','咖啡','COFFEE'),('อาหาร','飯店','KITCHEN'),('ชา','茶莊','TEA'),('ยินดีต้อนรับ','歡迎','WELCOME'),('ผลไม้','水果','FRUIT')]
colors=[('#a92525','#ffe1a0'),('#721b26','#f8c45c'),('#136761','#ffecc0'),('#e6ba65','#273c43')]
im=Image.new('RGB',(2048,512));d=ImageDraw.Draw(im)
for i,(th,zh,en) in enumerate(signs):
 x=(i%4)*512;y=(i//4)*256;bg,fg=colors[i%4];d.rectangle((x,y,x+511,y+255),fill=bg);d.rectangle((x+12,y+12,x+500,y+243),outline=fg,width=4)
 for text,yp,fontpath,size in [(th,58,str(cache/'NotoSansThai.ttf'),58),(zh,141,str(cache/'NotoSansSC.ttf'),48),(en,214,'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)]:
  f=ImageFont.truetype(fontpath,size);d.text((x+256,y+yp),text,font=f,fill=fg,anchor='mm')
im.save(root/'signs.png')
im=Image.new('RGB',(1024,512));d=ImageDraw.Draw(im)
for i,(th,zh,en) in enumerate(signs):
 x=i*128;bg,fg=colors[i%4];d.rectangle((x,0,x+127,511),fill=bg);d.rectangle((x+6,6,x+121,505),outline=fg,width=3)
 f=ImageFont.truetype(str(cache/'NotoSansSC.ttf'),77)
 for j,ch in enumerate(zh):d.text((x+64,74+j*99),ch,font=f,fill=fg,anchor='mm')
 f=ImageFont.truetype(str(cache/'NotoSansThai.ttf'),20);d.text((x+64,453),th,font=f,fill=fg,anchor='mm')
im.save(root/'vertical-signs.png')
im=Image.new('RGB',(256,128),'#efe7d0');d=ImageDraw.Draw(im);d.rounded_rectangle((3,3,252,124),radius=8,outline='#435454',width=3)
d.text((128,45),'สก ๘๑๒',font=ImageFont.truetype(str(cache/'NotoSansThai.ttf'),43),fill='#243336',anchor='mm')
d.text((128,96),'กรุงเทพมหานคร',font=ImageFont.truetype(str(cache/'NotoSansThai.ttf'),20),fill='#243336',anchor='mm');im.save(root/'license-plate.png')

im=Image.new('RGB',(1024,256));d=ImageDraw.Draw(im)
for i,text in enumerate(['เยาวราช','วัดไตรมิตร','หัวลำโพง','ทางลัด']):
 x=(i%2)*512;y=(i//2)*128;d.rectangle((x,y,x+511,y+127),fill='#84302f');d.rectangle((x+6,y+6,x+506,y+121),outline='#efd4a3',width=3);d.text((x+256,y+64),text,font=ImageFont.truetype(str(cache/'NotoSansThai.ttf'),52),fill='#efd4a3',anchor='mm')
im.save(root/'landmark-signs.png')
