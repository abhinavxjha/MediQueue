import numpy as np,pandas as pd
from sklearn.ensemble import RandomForestRegressor,RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score,accuracy_score
class OPDModels:
    def __init__(self):
        rng=np.random.default_rng(42); n=1800
        df=pd.DataFrame({'queue_size':rng.integers(0,30,n),'hour':rng.integers(8,20,n),'day':rng.integers(0,7,n),'avg_consultation':rng.normal(12,3,n).clip(5,30),'available_doctors':rng.integers(1,6,n),'lead_time_days':rng.integers(0,30,n),'previous_no_show':rng.integers(0,2,n),'cancellation_history':rng.integers(0,4,n)})
        df['waiting_time']=(df.queue_size*df.avg_consultation/df.available_doctors+(df.hour-12).abs()*1.2+rng.normal(0,4,n)).clip(0,180)
        df['no_show']=((.03*df.lead_time_days+.28*df.previous_no_show+.12*df.cancellation_history+rng.random(n))>.78).astype(int)
        self.wait_features=['queue_size','hour','day','avg_consultation','available_doctors']; self.no_show_features=['lead_time_days','hour','day','previous_no_show','cancellation_history']
        Xtr,Xte,ytr,yte=train_test_split(df[self.wait_features],df.waiting_time,test_size=.2,random_state=42); self.wait_model=RandomForestRegressor(n_estimators=120,random_state=42,n_jobs=-1).fit(Xtr,ytr); p=self.wait_model.predict(Xte); self.wait_mae=mean_absolute_error(yte,p); self.wait_rmse=mean_squared_error(yte,p)**.5; self.wait_r2=r2_score(yte,p)
        A,B,c,d=train_test_split(df[self.no_show_features],df.no_show,test_size=.2,random_state=42,stratify=df.no_show); self.no_show_model=RandomForestClassifier(n_estimators=120,random_state=42,n_jobs=-1).fit(A,c); self.no_show_accuracy=accuracy_score(d,self.no_show_model.predict(B))
    def wait(self,payload): return max(0,round(float(self.wait_model.predict(pd.DataFrame([payload],columns=self.wait_features))[0])))
    def no_show(self,payload): return round(float(self.no_show_model.predict_proba(pd.DataFrame([payload],columns=self.no_show_features))[0][1])*100,1)
models=OPDModels()
