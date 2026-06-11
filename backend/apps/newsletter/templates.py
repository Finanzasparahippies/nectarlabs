import re
from django.conf import settings

def get_hover_color(hex_str):
    if not hex_str:
        return "#d97706"
    clean_hex = hex_str.lstrip('#')
    if len(clean_hex) == 3:
        clean_hex = ''.join(c * 2 for c in clean_hex)
    if len(clean_hex) != 6:
        return hex_str
    try:
        r = int(clean_hex[0:2], 16)
        g = int(clean_hex[2:4], 16)
        b = int(clean_hex[4:6], 16)
    except ValueError:
        return hex_str
    
    # Relative luminance
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    factor = 0.15
    
    if luminance > 0.5:
        # Light color -> darken
        new_r = max(0, int(r * (1 - factor)))
        new_g = max(0, int(g * (1 - factor)))
        new_b = max(0, int(b * (1 - factor)))
    else:
        # Dark color -> lighten
        new_r = min(255, int(r + (255 - r) * factor))
        new_g = min(255, int(g + (255 - g) * factor))
        new_b = min(255, int(b + (255 - b) * factor))
        
    return f"#{new_r:02x}{new_g:02x}{new_b:02x}"

def format_campaign_text(text, mode='letter', alignment='center'):
    if not text:
        return ""
    
    # Clean up tags safely
    def replace_tag(match_obj):
        tag_html = match_obj.group(0)
        tag_name_match = re.match(r'</?([a-zA-Z0-9]+)', tag_html)
        if tag_name_match:
            tag_name = tag_name_match.group(1).lower()
            if tag_name in ['strong', 'b', 'em', 'i', 'u', 'span', 'a', 'font', 'img']:
                return tag_html
            if tag_name in ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']:
                return '\n'
        return ""

    # Replace specific closing blocks and brs with newlines
    normalized = re.sub(r'</p>', '\n\n', text, flags=re.IGNORECASE)
    normalized = re.sub(r'</div>', '\n', normalized, flags=re.IGNORECASE)
    normalized = re.sub(r'<br\s*/?>', '\n', normalized, flags=re.IGNORECASE)
    
    # Clean other tags
    normalized = re.sub(r'</?[a-zA-Z0-9]+[^>]*>', replace_tag, normalized)
    normalized = normalized.replace('\r\n', '\n').replace('\r', '\n')
    
    # Split by double/multiple newlines
    paragraphs = re.split(r'\n\n+', normalized)
    align_style = f"text-align: {alignment};"
    
    formatted_paragraphs = []
    if mode == 'letter':
        for p in paragraphs:
            lines = [line.strip() for line in p.split('\n') if line.strip()]
            if lines:
                clean_text = " ".join(lines)
                formatted_paragraphs.append(
                    f"<p style='margin: 0 0 16px 0; line-height: 1.8; font-family: inherit; {align_style}'>{clean_text}</p>"
                )
    else:
        # poem mode
        for p in paragraphs:
            lines = [line.strip() for line in p.split('\n') if line.strip()]
            if lines:
                stanza_html = "<br/>".join(lines)
                formatted_paragraphs.append(
                    f"<p style='margin: 0 0 24px 0; line-height: 1.8; font-family: inherit; {align_style}'>{stanza_html}</p>"
                )
                
    return "".join(formatted_paragraphs)

def compile_campaign_html(
    subject,
    title,
    content,
    brand_name="Néctar Labs",
    theme_color="#C68A1E",
    unsubscribe_url="",
    logo_url=None,
    template_type="minimalist",
    bg_image_url=None,
    bg_opacity=1.0,
    bg_saturation=100,
    bg_position="center",
    cta_text=None,
    cta_link=None,
    ctas=None,
    font_family="serif",
    title_font_family="serif",
    footer_font_family="serif",
    email_title=None,
    footer_text=None,
    image_url=None,
    image_style=None,
    custom_styles=None
):
    """
    Renders a stunning HTML campaign dynamic output with ms-ambar layout features,
    completely adapted to the tenant's brand name and brand colors.
    """
    api_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000').rstrip('/')
    custom_styles = custom_styles or {}
    image_style = image_style or {}
    ctas = ctas or []
    
    # Convert relative urls to absolute
    def make_absolute(url_str):
        if not url_str:
            return ""
        if not url_str.startswith('http://') and not url_str.startswith('https://'):
            if not url_str.startswith('/'):
                url_str = '/' + url_str
            return f"{api_url}{url_str}"
        return url_str

    # Defaults (minimalist Carbon style)
    bg_color = "#06070b"
    card_bg = "#0c0d13"
    border_style = f"1px solid {theme_color}1a"
    text_color = "#F4F6F0"
    accent_color = theme_color
    badge_bg = f"rgba(255, 191, 0, 0.15)"
    
    if template_type == 'moss':
        bg_color = "#0b130e"
        card_bg = "#122017"
        border_style = "1px solid #2e4d38"
        text_color = "#f5fbf7"
        badge_bg = "rgba(130, 201, 155, 0.15)"
    elif template_type == 'cosmic':
        bg_color = "#05050f"
        card_bg = "#0c0a1a"
        border_style = "1px solid #4a154b"
        text_color = "#F4F6F0"
        badge_bg = "rgba(192, 132, 252, 0.15)"
    elif template_type == 'glow':
        bg_color = "#0f0b07"
        card_bg = "#1a130c"
        border_style = "1px solid #d97706"
        text_color = "#fffdfa"
        badge_bg = "rgba(245, 158, 11, 0.15)"
    elif template_type == 'mist':
        bg_color = "#0f1115"
        card_bg = "#181b22"
        border_style = "1px solid #374151"
        text_color = "#f3f4f6"
        badge_bg = "rgba(6, 182, 212, 0.15)"

    font_configs = {
        'serif': {
            'import': "",
            'family': "Georgia, Garamond, serif"
        },
        'playfair': {
            'import': "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');",
            'family': "'Playfair Display', Georgia, serif"
        },
        'cinzel': {
            'import': "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');",
            'family': "'Cinzel', Georgia, serif"
        },
        'garamond': {
            'import': "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap');",
            'family': "'Cormorant Garamond', 'Times New Roman', serif"
        },
        'montserrat': {
            'import': "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');",
            'family': "'Montserrat', Helvetica, Arial, sans-serif"
        },
        'pinyon': {
            'import': "@import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');",
            'family': "'Pinyon Script', cursive"
        }
    }

    title_font_config = font_configs.get(title_font_family, font_configs['serif'])
    body_font_config = font_configs.get(font_family, font_configs['serif'])
    footer_font_config = font_configs.get(footer_font_family, font_configs['serif'])

    unique_imports = {title_font_config['import'], body_font_config['import'], footer_font_config['import']}
    font_import = "\n".join([imp for imp in unique_imports if imp])

    title_font_family = title_font_config['family']
    body_font_family = body_font_config['family']
    footer_font_family = footer_font_config['family']

    bg_style = ""
    if bg_image_url:
        bg_url = make_absolute(bg_image_url)
        overlay_alpha = round(1.0 - float(bg_opacity), 2)
        overlay_alpha = max(0.0, min(1.0, overlay_alpha))
        
        # Base RGB overlay matching card style base color
        theme_rgb = "12, 13, 19"
        if template_type == 'moss':
            theme_rgb = "18, 32, 23"
        elif template_type == 'cosmic':
            theme_rgb = "12, 10, 26"
        elif template_type == 'glow':
            theme_rgb = "26, 19, 12"
        elif template_type == 'mist':
            theme_rgb = "24, 27, 34"
            
        bg_style = f"background-image: linear-gradient(rgba({theme_rgb}, {overlay_alpha}), rgba({theme_rgb}, {overlay_alpha})), url('{bg_url}'); background-position: {bg_position}; background-repeat: no-repeat; background-size: cover; filter: saturate({bg_saturation}%);"

    # Responsive metrics
    card_max_width_desktop = custom_styles.get('card_max_width_desktop', '680px')
    card_padding_desktop = custom_styles.get('card_padding_desktop', '40px')
    title_font_size_desktop = custom_styles.get('title_font_size_desktop', '26px')
    body_font_size_desktop = custom_styles.get('body_font_size_desktop', '16px')
    body_alignment_desktop = custom_styles.get('body_alignment', 'center')
    body_alignment_desktop = custom_styles.get('body_alignment_desktop', body_alignment_desktop)
    
    card_padding_tablet = custom_styles.get('card_padding_tablet', card_padding_desktop)
    title_font_size_tablet = custom_styles.get('title_font_size_tablet', '22px')
    body_font_size_tablet = custom_styles.get('body_font_size_tablet', '15px')
    body_alignment_tablet = custom_styles.get('body_alignment_tablet', body_alignment_desktop)
    
    card_padding_mobile = custom_styles.get('card_padding_mobile', '16px')
    title_font_size_mobile = custom_styles.get('title_font_size_mobile', '18px')
    body_font_size_mobile = custom_styles.get('body_font_size_mobile', '14px')
    body_alignment_mobile = custom_styles.get('body_alignment_mobile', body_alignment_tablet)

    # Responsive Images
    image_width_desktop = image_style.get('width', '100%')
    image_align_desktop = image_style.get('align', 'center')
    image_radius = image_style.get('radius', '20px')
    image_width_tablet = custom_styles.get('image_width_tablet', image_width_desktop)
    image_align_tablet = custom_styles.get('image_align_tablet', image_align_desktop)
    image_width_mobile = custom_styles.get('image_width_mobile', image_width_tablet)
    image_align_mobile = custom_styles.get('image_align_mobile', image_align_tablet)

    # CTA responsive alignment
    cta_alignment_desktop = custom_styles.get('cta_alignment', 'center')
    cta_alignment_desktop = custom_styles.get('cta_alignment_desktop', cta_alignment_desktop)
    cta_alignment_tablet = custom_styles.get('cta_alignment_tablet', cta_alignment_desktop)
    cta_alignment_mobile = custom_styles.get('cta_alignment_mobile', cta_alignment_tablet)

    image_html = ""
    if image_url:
        img_absolute_url = make_absolute(image_url)
        wrapper_style = "margin-bottom: 30px;"
        if image_align_desktop == 'center':
            wrapper_style += " text-align: center;"
        elif image_align_desktop == 'left':
            wrapper_style += " text-align: left;"
        elif image_align_desktop == 'right':
            wrapper_style += " text-align: right;"
            
        image_html = f"""
        <div class="email-cover-wrapper" style="{wrapper_style}">
            <img class="email-cover-image" src="{img_absolute_url}" style="width: {image_width_desktop}; max-width: 100%; height: auto; border-radius: {image_radius}; border: {border_style}; display: inline-block;" />
        </div>
        """

    # Title & Body Customization
    title_color = custom_styles.get('title_color', '#F4F6F0')
    title_padding = custom_styles.get('title_padding', '0px')
    title_radius = custom_styles.get('title_radius', '0px')
    
    body_color = custom_styles.get('body_color', text_color)
    body_padding = custom_styles.get('body_padding', '0px')
    body_radius = custom_styles.get('body_radius', '0px')

    footer_color = custom_styles.get('footer_color', 'rgba(244, 246, 240, 0.35)')
    footer_padding = custom_styles.get('footer_padding', '0px')
    footer_radius = custom_styles.get('footer_radius', '0px')

    # Styles
    title_bg_style = f"background-color: {custom_styles.get('title_bg_color', 'transparent')}"
    body_bg_style = f"background-color: {custom_styles.get('body_bg_color', 'transparent')}"
    footer_bg_style = f"background-color: {custom_styles.get('footer_bg_color', 'transparent')}"

    hover_css_rules = []
    cta_html = ""
    
    if ctas:
        cta_buttons = []
        for cidx, cta in enumerate(ctas):
            btn_text = cta.get('text', '')
            btn_link = cta.get('link', '') or '#'
            btn_bg = cta.get('bg_color') or accent_color
            btn_color = cta.get('text_color', '#080C0A')
            btn_radius = cta.get('radius', '12px')
            btn_padding = '14px 28px'
            
            btn_shadow = '0 5px 15px rgba(0,0,0,0.2)'
            btn_display = 'block' if cta.get('is_full_width', False) else 'inline-block'
            btn_margin = '10px auto' if cta.get('is_full_width', False) else '5px 10px'
            
            if btn_text:
                hover_bg = get_hover_color(btn_bg)
                btn_class = f"email-cta-btn-{cidx}"
                hover_css_rules.append(f".{btn_class}:hover {{ background-color: {hover_bg} !important; }}")
                cta_buttons.append(f"""
                <a href="{btn_link}" class="{btn_class}" style="background-color: {btn_bg}; color: {btn_color}; padding: {btn_padding}; border-radius: {btn_radius}; font-size: 13px; font-weight: bold; text-decoration: none; display: {btn_display}; margin: {btn_margin}; letter-spacing: 1px; text-transform: uppercase; box-shadow: {btn_shadow}; text-align: center; transition: background-color 0.2s ease-in-out;">
                    {btn_text}
                </a>
                """)
        if cta_buttons:
            cta_html = f"""
            <div class="email-cta-box" style="text-align: {cta_alignment_desktop}; margin-top: 35px; margin-bottom: 25px;">
                {"".join(cta_buttons)}
            </div>
            """
    elif cta_text:
        cta_link = cta_link or '#'
        hover_bg = get_hover_color(accent_color)
        hover_css_rules.append(f".email-cta-btn-single:hover {{ background-color: {hover_bg} !important; }}")
        cta_html = f"""
        <div class="email-cta-box" style="text-align: {cta_alignment_desktop}; margin-top: 35px; margin-bottom: 25px;">
            <a href="{cta_link}" class="email-cta-btn-single" style="background-color: {accent_color}; color: #080C0A; padding: 14px 28px; border-radius: 12px; font-size: 13px; font-weight: bold; text-decoration: none; display: inline-block; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: background-color 0.2s ease-in-out;">
                {cta_text}
            </a>
        </div>
        """

    # Convert relative urls to absolute in text content
    text_mode = custom_styles.get('text_mode', 'letter')
    formatted_body = format_campaign_text(content, text_mode, body_alignment_desktop)
    
    # Absolute Media paths helper
    def make_urls_absolute(text):
        if not text:
            return ""
        text = text.replace('src="/media/', f'src="{api_url}/media/')
        text = text.replace("src='/media/", f"src='{api_url}/media/")
        text = text.replace('src="media/', f'src="{api_url}/media/')
        text = text.replace("src='media/", f"src='{api_url}/media/")
        text = re.sub(r'(src=["\'])(https?://[^/]+)/media/', rf'\1{api_url}/media/', text)
        
        text = text.replace('href="/media/', f'href="{api_url}/media/')
        text = text.replace("href='/media/", f"href='{api_url}/media/")
        text = text.replace('href="media/', f'href="{api_url}/media/')
        text = text.replace("href='media/", f"href='{api_url}/media/")
        text = re.sub(r'(href=["\'])(https?://[^/]+)/media/', rf'\1{api_url}/media/', text)
        return text

    formatted_body = make_urls_absolute(formatted_body)
    email_title_to_render = make_urls_absolute(email_title or title or subject)
    
    if footer_text:
        footer_html = f"<div style='margin: 0 0 10px 0;'>{footer_text}</div>"
    else:
        footer_html = f"<p style='margin: 0 0 10px 0; font-weight: 500;'>Recibiste este correo porque estás suscrito al newsletter de {brand_name}.</p>"
    footer_html = make_urls_absolute(footer_html)

    logo_markup = ""
    if logo_url:
        logo_markup = f"""
        <div style="display: inline-block; width: 60px; height: 60px; background-color: #080C0A; border: 1px solid {theme_color}55; border-radius: 50%; overflow: hidden; text-align: center; padding: 6px; box-sizing: border-box; box-shadow: 0 0 20px {theme_color}1f; vertical-align: middle;">
            <img src="{logo_url}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; display: block; margin: 0 auto;" />
        </div>
        """

    hover_rules_css = "\n".join(hover_css_rules)

    html_content = f"""
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          {font_import}
          
          /* Hover effects */
          {hover_rules_css}
          
          /* Responsive email layout styling */
          @media only screen and (max-width: 768px) {{
            .email-card {{
              width: 100% !important;
              min-width: 300px !important;
              box-sizing: border-box !important;
              padding: {card_padding_tablet} !important;
            }}
            .email-title-h2 {{
              font-size: {title_font_size_tablet} !important;
            }}
            .email-poem-text {{
              font-size: {body_font_size_tablet} !important;
              text-align: {body_alignment_tablet} !important;
            }}
            .email-cover-wrapper {{
              text-align: {image_align_tablet} !important;
            }}
            .email-cover-image {{
              width: {image_width_tablet} !important;
            }}
            .email-cta-box {{
              text-align: {cta_alignment_tablet} !important;
            }}
            .email-body {{
              padding: 16px 8px !important;
            }}
          }}
          
          @media only screen and (max-width: 480px) {{
            .email-card {{
              width: 100% !important;
              min-width: 300px !important;
              box-sizing: border-box !important;
              padding: {card_padding_mobile} !important;
              border-radius: 20px !important;
            }}
            .email-title-h2 {{
              font-size: {title_font_size_mobile} !important;
            }}
            .email-poem-text {{
              font-size: {body_font_size_mobile} !important;
              text-align: {body_alignment_mobile} !important;
            }}
            .email-cover-wrapper {{
              text-align: {image_align_mobile} !important;
            }}
            .email-cover-image {{
              width: {image_width_mobile} !important;
            }}
            .email-cta-box {{
              text-align: {cta_alignment_mobile} !important;
            }}
            .email-body {{
              padding: 12px 8px !important;
            }}
          }}
        </style>
      </head>
      <body class="email-body" style="background-color: {bg_color}; color: {text_color}; font-family: {body_font_family}; padding: 40px 20px; margin: 0; text-align: center; -webkit-font-smoothing: antialiased;">
        <div class="email-card" style="max-width: {card_max_width_desktop}; width: 100%; min-width: 300px; box-sizing: border-box; margin: 0 auto; background: {card_bg}; {bg_style} border: {border_style}; padding: {card_padding_desktop}; border-radius: 32px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); text-align: left;">
          
          <!-- Header/Logo -->
          <div class="email-header" style="text-align: center; margin-bottom: 40px;">
            {logo_markup}
            <h1 style="color: #F4F6F0; font-size: 26px; font-weight: 900; letter-spacing: -0.05em; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; font-style: italic;">{brand_name}</h1>
            <div style="height: 1px; width: 40px; background-color: {theme_color}4d; margin: 8px auto;"></div>
            <p style="color: {accent_color}; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin: 0;">Boletín Oficial • Suscripción Exclusiva</p>
          </div>
          
          <!-- Cover image if exists -->
          {image_html}
          
          <!-- Subject / Title Block -->
          <div class="email-title" style="color: {title_color}; font-family: {title_font_family}; padding: {title_padding}; border-radius: {title_radius}; {title_bg_style}; margin-bottom: 30px; box-sizing: border-box;">
            <h2 class="email-title-h2" style="color: inherit; font-size: {title_font_size_desktop}; font-weight: 900; line-height: 1.3; margin: 0; letter-spacing: -0.02em; text-align: center; font-style: italic; font-family: inherit;">
              {email_title_to_render}
            </h2>
          </div>
          
          <!-- Body content / Body Block -->
          <div class="email-poem-box" style="color: {body_color}; font-family: {body_font_family}; padding: {body_padding}; border-radius: {body_radius}; {body_bg_style}; margin-bottom: 40px; box-sizing: border-box; text-align: center;">
            <div class="email-poem-text" style="color: inherit; font-size: {body_font_size_desktop}; line-height: 1.8; text-align: {body_alignment_desktop}; font-style: italic; opacity: 0.9; font-family: inherit; padding: 10px; display: inline-block; max-width: 90%; word-break: break-word;">
              {formatted_body}
            </div>
          </div>
          
          <!-- Dynamic CTA Button -->
          <div class="email-cta-box" style="box-sizing: border-box;">
            {cta_html}
          </div>
          
          <!-- Footer Block -->
          <div class="email-footer" style="color: {footer_color}; font-family: {footer_font_family}; padding: {footer_padding}; border-radius: {footer_radius}; {footer_bg_style}; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 25px; margin-top: 45px; line-height: 1.6; box-sizing: border-box;">
            {footer_html}
            <p style="margin: 0;"><a href="{unsubscribe_url}" style="color: {accent_color}; text-decoration: none; border-bottom: 1px solid {theme_color}40; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Desuscribirse</a></p>
          </div>
          
        </div>
      </body>
    </html>
    """
    return html_content
