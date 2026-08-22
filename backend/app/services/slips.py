import io,base64,json,qrcode
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

def qr_data_url(payload):
    qr=qrcode.make(json.dumps(payload)); buf=io.BytesIO(); qr.save(buf,format='PNG'); return 'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()
def build_pdf(details):
    buf=io.BytesIO(); c=canvas.Canvas(buf,pagesize=A4); c.setTitle('MediQueue E-Slip'); c.setFont('Helvetica-Bold',22); c.drawString(55,790,'MediQueue'); c.setFont('Helvetica',11); c.drawString(55,770,'Smart OPD Appointment, Queue & E-Slip Management System'); y=720
    for label,value in details.items(): c.setFont('Helvetica-Bold',10); c.drawString(55,y,str(label)); c.setFont('Helvetica',11); c.drawString(190,y,str(value)); y-=26
    c.setFont('Helvetica-Bold',18); c.drawString(55,y-10,'Book. Check In. Track. Consult.'); c.showPage(); c.save(); return buf.getvalue()
