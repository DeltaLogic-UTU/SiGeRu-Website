const PROFILE_KEY='sigeru-perfil-vecino';
const DEFAULT_PROFILE={
  nombre:'Vecino',
  apellido:'117',
  documento:'4.100.000-1',
  telefono:'098 100 100',
  email:'vecino@sigeru.uy',
  rol:'vecino',
  password:'Sigeru123'
};

const form=document.getElementById('profileForm');
const message=document.getElementById('profileMessage');

function loadProfile(){
  let profile={...DEFAULT_PROFILE};
  try{
    const saved=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
    if(saved)profile={...profile,...saved};
  }catch(_){}

  ['nombre','apellido','documento','telefono','email'].forEach((field)=>{
    if(form.elements[field])form.elements[field].value=profile[field]||'';
  });
  return profile;
}

let currentProfile=loadProfile();

function showProfileMessage(text,error=false){
  message.textContent=text;
  message.classList.toggle('error',error);
  message.style.display='block';
}

async function validateProfile(payload){
  if(location.protocol==='file:')return {success:true};
  try{
    const response=await fetch('../api-usuarios/validations.php',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({accion:'perfil',...payload})
    });
    return await response.json();
  }catch(_){
    return {success:true};
  }
}

form.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const data=Object.fromEntries(new FormData(form).entries());
  const password=data.password.trim();
  const confirmation=data.password_confirm.trim();

  if(password!==confirmation){
    showProfileMessage('Las contraseñas no coinciden.',true);
    return;
  }
  if(password && password.length<8){
    showProfileMessage('La nueva contraseña debe tener 8 o más caracteres.',true);
    return;
  }

  const profile={
    ...currentProfile,
    nombre:data.nombre.trim(),
    apellido:data.apellido.trim(),
    documento:data.documento.trim(),
    telefono:data.telefono.trim(),
    email:data.email.trim().toLowerCase(),
    rol:'vecino',
    password:password||currentProfile.password||DEFAULT_PROFILE.password
  };

  const result=await validateProfile({...profile,password});
  if(!result.success){
    showProfileMessage(result.message||'No se pudo validar el perfil.',true);
    return;
  }

  currentProfile=profile;
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
  sessionStorage.setItem('sigeruNombre',`${profile.nombre} ${profile.apellido}`.trim());
  sessionStorage.setItem('sigeruEmail',profile.email);
  form.elements.password.value='';
  form.elements.password_confirm.value='';
  showProfileMessage('Tus datos se actualizaron correctamente.');
});
